import pytest
import yaml


@pytest.fixture()
def home(tmp_path, monkeypatch):
    """A throwaway implementation root with its own database, users and alert rules."""
    (tmp_path / "configs").mkdir()
    (tmp_path / "monitoring").mkdir()
    (tmp_path / "configs" / "users.yaml").write_text(
        yaml.safe_dump({"users": [{"username": "ana", "roles": ["analyst"]}, {"username": "bo", "roles": ["analyst", "ml-admin"]}]})
    )
    (tmp_path / "monitoring" / "alerts.yaml").write_text(
        yaml.safe_dump(
            {"rules": [{"name": "HighErrorRate", "metric": "error_rate", "op": ">", "threshold": 0.05, "severity": "page",
                        "summary": "error rate high", "promql": "rate(errors[5m]) > 0.05"}]}
        )
    )
    monkeypatch.setenv("APP_HOME", str(tmp_path))
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("SOURCE_DATABASE_URL", raising=False)
    monkeypatch.setenv("AUTH_MODE", "local")
    monkeypatch.setenv("JWT_SECRET", "s" * 48)
    monkeypatch.setenv("USER_ANA_PASSWORD", "ana-pass")
    monkeypatch.setenv("USER_BO_PASSWORD", "bo-pass")
    from bsref import config, db

    config.reset_settings()
    db.reset_engines()
    db.init_schema()
    yield tmp_path
    config.reset_settings()
    db.reset_engines()
