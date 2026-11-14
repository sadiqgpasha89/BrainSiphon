"""BrainSiphon FDE pre-flight toolkit.

Standard library only, so it runs on a locked-down jump host with no package index and no internet access.
Each check returns a `CheckResult`; the runner collects them into a machine-readable readiness report.
"""

__version__ = "1.0.0"
REPORT_SCHEMA_VERSION = "1.0"
