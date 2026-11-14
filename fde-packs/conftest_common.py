"""Shared pytest path setup for every pack: the pack's own src and the adapter framework."""
import os
import sys


def setup(pack_file: str) -> None:
    pack = os.path.dirname(os.path.dirname(os.path.abspath(pack_file)))
    root = os.path.dirname(os.path.dirname(os.path.dirname(pack)))
    for p in (os.path.join(pack, "src"), os.path.join(root, "fde-adapters")):
        if p not in sys.path:
            sys.path.insert(0, p)
