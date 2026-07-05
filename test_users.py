import pytest


class TestUserRegistration:
    def test_register_senior(self, client):
        r = client.post("/users/register", json={
            "name": "Sam", "email": "sam@test.com", "role": "senior"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["user_id"] > 0
        assert "User registered" in data["message"]

    def test_register_volunteer(self, client):
        r = client.post("/users/register", json={
            "name": "Val", "email": "val@test.com", "role": "volunteer"
        })
        assert r.status_code == 200
        assert r.json()["user_id"] > 0

    def test_register_coordinator(self, client):
        r = client.post("/users/register", json={
            "name": "Cory", "email": "cory@test.com", "role": "coordinator"
        })
        assert r.status_code == 200
        assert r.json()["user_id"] > 0

    def test_register_duplicate_email_fails(self, client):
        client.post("/users/register", json={
            "name": "A", "email": "dup@test.com", "role": "senior"
        })
        r = client.post("/users/register", json={
            "name": "B", "email": "dup@test.com", "role": "volunteer"
        })
        assert r.status_code == 200
        assert "error" in r.json()

    def test_get_user_by_id(self, client, senior_user):
        r = client.get(f"/users/{senior_user}")
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "Sam Senior"
        assert data["role"] == "senior"

    def test_get_user_not_found(self, client):
        r = client.get("/users/99999")
        assert r.status_code == 200
        assert "error" in r.json()
