"""ISO 8583 (1987, ASCII) pack and unpack for card authorisation messages.

Covers the message types a fraud-decision hop sees: 0100/0110 authorisation, 0200/0210 financial, 0120/0220 advice, 0400/0410 and
0420/0430 reversal, 0800/0810 network. The field table below is the common subset; **acquirer-specific** usage (private fields 48,
60, 62, 63, EMV tags in 55) lives in a profile (`profiles/`), because every switch and acquirer differs. Obtain the acquirer's
interface specification and put its differences in a profile; do not edit this table per customer.
"""
from __future__ import annotations

import binascii
import struct
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

# number -> (kind, length kind, max length, name).  kind: n numeric, an alphanumeric, ans printable, z track, b binary (hex in ASCII)
FIELDS: Dict[int, tuple] = {
    2: ("n", "LLVAR", 19, "Primary account number"), 3: ("n", "FIXED", 6, "Processing code"), 4: ("n", "FIXED", 12, "Amount, transaction"),
    5: ("n", "FIXED", 12, "Amount, settlement"), 6: ("n", "FIXED", 12, "Amount, cardholder billing"), 7: ("n", "FIXED", 10, "Transmission date and time MMDDhhmmss"),
    11: ("n", "FIXED", 6, "System trace audit number (STAN)"), 12: ("n", "FIXED", 6, "Local transaction time hhmmss"), 13: ("n", "FIXED", 4, "Local transaction date MMDD"),
    14: ("n", "FIXED", 4, "Expiration date YYMM"), 18: ("n", "FIXED", 4, "Merchant category code"), 22: ("n", "FIXED", 3, "POS entry mode"),
    23: ("n", "FIXED", 3, "Card sequence number"), 25: ("n", "FIXED", 2, "POS condition code"), 32: ("n", "LLVAR", 11, "Acquiring institution id"),
    33: ("n", "LLVAR", 11, "Forwarding institution id"), 35: ("z", "LLVAR", 37, "Track 2 data"), 37: ("an", "FIXED", 12, "Retrieval reference number (RRN)"),
    38: ("an", "FIXED", 6, "Authorisation identification response"), 39: ("an", "FIXED", 2, "Response code"), 41: ("ans", "FIXED", 8, "Card acceptor terminal id"),
    42: ("ans", "FIXED", 15, "Card acceptor id (merchant)"), 43: ("ans", "FIXED", 40, "Card acceptor name and location"), 44: ("an", "LLVAR", 25, "Additional response data"),
    48: ("ans", "LLLVAR", 999, "Additional data, private"), 49: ("n", "FIXED", 3, "Currency code, transaction"), 51: ("n", "FIXED", 3, "Currency code, cardholder billing"),
    52: ("b", "FIXED", 8, "PIN block"), 54: ("an", "LLLVAR", 120, "Additional amounts"), 55: ("b", "LLLVAR", 255, "ICC (EMV) data"),
    60: ("ans", "LLLVAR", 999, "Private use"), 62: ("ans", "LLLVAR", 999, "Private use"), 63: ("ans", "LLLVAR", 999, "Private use"),
    70: ("n", "FIXED", 3, "Network management information code"), 90: ("n", "FIXED", 42, "Original data elements"), 102: ("ans", "LLVAR", 28, "Account identification 1"),
}
RESPONSE_TYPE = {"0100": "0110", "0200": "0210", "0120": "0130", "0220": "0230", "0400": "0410", "0420": "0430", "0800": "0810"}
RESPONSE_CODES = {
    "00": "Approved", "05": "Do not honour", "10": "Partial approval", "14": "Invalid card number", "30": "Format error", "51": "Insufficient funds",
    "57": "Transaction not permitted to cardholder", "59": "Suspected fraud", "61": "Exceeds withdrawal amount limit", "91": "Issuer or switch inoperative",
    "1A": "Additional customer authentication required (step-up)", "94": "Duplicate transmission", "96": "System malfunction",
}


class IsoError(ValueError):
    pass


@dataclass
class IsoMessage:
    mti: str
    f: Dict[int, str] = field(default_factory=dict)

    def get(self, n: int, default: str = "") -> str:
        return self.f.get(n, default)

    def key(self) -> tuple:
        """What identifies a transaction on the wire: the fields a retransmission repeats, plus the message class and function.

        0100 and 0101 (the repeat flag) are the same transaction; 0100 and 0400 (its reversal) are not.
        """
        function = "advice" if self.mti[2] in "23" else "request"
        return (self.get(32), self.get(37), self.get(11), self.get(41), self.get(7), self.mti[1], function)


def _bitmap(nums) -> bytes:
    bits = [0] * 128
    for n in nums:
        bits[n - 1] = 1
    if any(bits[64:]):
        bits[0] = 1
    size = 128 if bits[0] else 64
    out = bytearray()
    for i in range(0, size, 8):
        v = 0
        for b in bits[i : i + 8]:
            v = (v << 1) | b
        out.append(v)
    return bytes(out)


def pack(m: IsoMessage, *, bitmap: str = "hex") -> bytes:
    """`bitmap`: "hex" (16 or 32 ASCII hex characters, common on TCP host links) or "binary" (8 or 16 raw bytes)."""
    if len(m.mti) != 4 or not m.mti.isdigit():
        raise IsoError(f"MTI must be four digits, got {m.mti!r}")
    for n in m.f:
        if n not in FIELDS:
            raise IsoError(f"field {n} is not in the field table (add it to a profile)")
    bm = _bitmap(sorted(m.f))
    out = m.mti.encode() + (binascii.hexlify(bm).upper() if bitmap == "hex" else bm)
    for n in sorted(m.f):
        kind, ln, mx, name = FIELDS[n]
        v = m.f[n]
        if kind == "b":
            v = v.upper()
            if len(v) % 2 or any(c not in "0123456789ABCDEF" for c in v):
                raise IsoError(f"field {n} ({name}) must be hex")
        if len(v) > (mx * 2 if kind == "b" else mx):
            raise IsoError(f"field {n} ({name}) is {len(v)} long, maximum {mx}")
        if kind == "n" and not v.isdigit():
            raise IsoError(f"field {n} ({name}) must be numeric, got {v!r}")
        if ln == "FIXED":
            width = mx * 2 if kind == "b" else mx
            v = v.zfill(width) if kind == "n" else v.ljust(width)
            if len(v) != width:
                raise IsoError(f"field {n} ({name}) must be {width} long")
            out += v.encode()
        else:
            digits = 2 if ln == "LLVAR" else 3
            out += str(len(v)).zfill(digits).encode() + v.encode()
    return out


def unpack(data: bytes, *, bitmap: str = "hex") -> IsoMessage:
    try:
        mti = data[:4].decode()
        if not mti.isdigit():
            raise IsoError(f"MTI {mti!r} is not numeric")
        o = 4
        if bitmap == "hex":
            first = binascii.unhexlify(data[o : o + 16])
            o += 16
            bm = first
            if first[0] & 0x80:
                bm += binascii.unhexlify(data[o : o + 16])
                o += 16
        else:
            first = data[o : o + 8]
            o += 8
            bm = first
            if first[0] & 0x80:
                bm += data[o : o + 8]
                o += 8
        present = [i + 1 for i in range(len(bm) * 8) if bm[i // 8] & (0x80 >> (i % 8)) and i != 0]
        f: Dict[int, str] = {}
        for n in present:
            if n not in FIELDS:
                raise IsoError(f"field {n} is present but not defined: the message uses fields this profile does not know")
            kind, ln, mx, name = FIELDS[n]
            if ln == "FIXED":
                width = mx * 2 if kind == "b" else mx
            else:
                d = 2 if ln == "LLVAR" else 3
                width = int(data[o : o + d].decode())
                o += d
                if width > (mx * 2 if kind == "b" else mx):
                    raise IsoError(f"field {n} ({name}) declares length {width}, maximum {mx}")
            chunk = data[o : o + width]
            if len(chunk) != width:
                raise IsoError(f"message ends inside field {n} ({name}): wanted {width} bytes, got {len(chunk)}")
            f[n] = chunk.decode("ascii")
            o += width
        if o != len(data):
            raise IsoError(f"{len(data) - o} unexpected trailing byte(s) after the last field")
        return IsoMessage(mti, f)
    except (ValueError, binascii.Error, IndexError) as e:
        if isinstance(e, IsoError):
            raise
        raise IsoError(f"cannot parse ISO 8583 message: {e}") from e


def frame(payload: bytes) -> bytes:
    """Two-byte big-endian length header, as most TCP host links use."""
    return struct.pack("!H", len(payload)) + payload


def respond(req: IsoMessage, code: str, *, auth_id: str = "", extra: Optional[Dict[int, str]] = None) -> IsoMessage:
    """The response to a request: response MTI, the fields the sender needs echoed back, and DE39."""
    if req.mti not in RESPONSE_TYPE:
        raise IsoError(f"no response type for MTI {req.mti}")
    echo = {n: req.f[n] for n in (2, 3, 4, 7, 11, 12, 13, 32, 33, 37, 41, 42, 49) if n in req.f}
    out = IsoMessage(RESPONSE_TYPE[req.mti], echo)
    out.f[39] = code
    if auth_id:
        out.f[38] = auth_id[:6]
    out.f.update(extra or {})
    return out
