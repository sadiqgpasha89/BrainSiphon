Safe test fixtures
- Domains end in .invalid (reserved by RFC 6761: they can never resolve).
- URLs are defanged (hxxps, [.]). Re-fang only inside the sandbox harness.
- No attachment payloads. For attachment-path testing use the standard antivirus test string (EICAR) generated at test time by the test harness, and the GTUBE string for spam engines:
  neither is malicious, both are recognised by scanners by design. Never store live malware in this repository.
