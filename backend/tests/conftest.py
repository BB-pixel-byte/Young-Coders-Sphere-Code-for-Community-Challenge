import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def clean_db(monkeypatch, tmp_path):
    monkeypatch.setenv("CHORE4MORE_DB_PATH", str(tmp_path / "chore4more.db"))
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    monkeypatch.setenv("ANALYTICS_PASSWORD", "portfolio-test-password")
    monkeypatch.setenv("CHORE4MORE_TEST_MODE", "1")

    from models.database import init_db
    init_db()


@pytest.fixture
def client():
    from main import app
    return TestClient(app)


@pytest.fixture
def senior_user(client):
    r = client.post("/users/register", json={
        "name": "Sam Senior", "email": "sam@test.com", "role": "senior"
    })
    assert r.status_code == 200
    return r.json()["user_id"]


@pytest.fixture
def volunteer_user(client):
    r = client.post("/users/register", json={
        "name": "Val Volunteer", "email": "val@test.com", "role": "volunteer"
    })
    assert r.status_code == 200
    return r.json()["user_id"]


@pytest.fixture
def coordinator_user(client):
    r = client.post("/users/register", json={
        "name": "Cory Coordinator", "email": "cory@test.com", "role": "coordinator"
    })
    assert r.status_code == 200
    return r.json()["user_id"]
