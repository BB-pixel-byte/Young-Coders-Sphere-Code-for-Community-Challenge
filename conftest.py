import os
import pytest
from fastapi.testclient import TestClient


TEST_DB = os.path.join(os.path.dirname(__file__), "test_choremap.db")


@pytest.fixture(autouse=True)
def clean_db(monkeypatch):
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)
    monkeypatch.setenv("CHOREMAP_DB_PATH", TEST_DB)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")

    from models.database import init_db
    init_db()
    yield
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)


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
