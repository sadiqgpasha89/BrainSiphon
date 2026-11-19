"""`python -m bsref.setup`: create .env from .env.example, generating the JWT secret and a random password for every demo
user. Nothing is overwritten: an existing .env is left as it is."""

from __future__ import annotations

import secrets

from .config import home


def main() -> None:
    root = home()
    target, example = root / ".env", root / ".env.example"
    if target.exists():
        print(".env already exists: left unchanged")
        return
    lines = []
    for line in example.read_text(encoding="utf-8").splitlines():
        key = line.split("=", 1)[0].strip()
        if line.strip().endswith("=") and key == "JWT_SECRET":
            line = f"JWT_SECRET={secrets.token_urlsafe(48)}"
        elif line.strip().endswith("=") and key.endswith("_PASSWORD"):
            line = f"{key}={secrets.token_urlsafe(18)}"
        lines.append(line)
    target.write_text("\n".join(lines) + "\n", encoding="utf-8")
    target.chmod(0o600)
    print("wrote .env with a generated JWT secret and demo-user passwords (file mode 600, git-ignored)")


if __name__ == "__main__":
    main()
