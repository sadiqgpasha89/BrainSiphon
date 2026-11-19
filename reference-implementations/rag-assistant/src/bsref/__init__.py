"""bsref: the platform layer shared by every BrainSiphon reference implementation.

The single source lives in reference-implementations/_platform/bsref. `tools/sync_platform.py` copies it into each
implementation's src/bsref so that every implementation directory is self-contained and can be lifted out of this repository.
Do not edit a vendored copy: edit the source and re-run the sync (CI fails when they differ).
"""

__version__ = "1.0.0"
