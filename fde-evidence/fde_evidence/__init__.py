"""Handover evidence for a customer deployment: infrastructure inventory, release identity, and a checksummed, sealed pack.

Standard library only. Nothing here talks to a cloud account: it reads files the FDE already has (a Terraform state or plan,
kubectl JSON, the git checkout) so it works in restricted and air-gapped environments.
"""

__version__ = "1.0.0"
