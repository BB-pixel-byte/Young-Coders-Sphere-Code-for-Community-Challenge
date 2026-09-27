"""Exercise the actual pilot authorization path, separate from legacy API tests."""


def register(client, role, email, code="invite-for-testing"):
    response = client.post("/users/register", json={
        "name": role.title(), "email": email, "role": role,
        "password": "long-test-password", "invite_code": code,
    })
    assert response.status_code == 200, response.text
    return response.json()


def bearer(account):
    return {"Authorization": f"Bearer {account['token']}"}


def test_invitation_and_private_account_data(client, monkeypatch):
    monkeypatch.delenv("CHORE4MORE_TEST_MODE")
    monkeypatch.setenv("PILOT_INVITE_CODE", "invite-for-testing")

    assert client.post("/users/register", json={
        "name": "Test", "email": "x@test.com", "role": "senior",
        "password": "long-test-password", "invite_code": "wrong",
    }).status_code == 403
    assert client.post("/users/register", json={
        "name": "Test", "email": "x@test.com", "role": "coordinator",
        "password": "long-test-password", "invite_code": "invite-for-testing",
    }).status_code == 400

    senior = register(client, "senior", "senior.private@test.com")
    volunteer = register(client, "volunteer", "volunteer.private@test.com")
    assert client.get(f"/users/{senior['user_id']}").status_code == 401
    assert client.get(f"/users/{senior['user_id']}", headers=bearer(volunteer)).status_code == 403
    own = client.get(f"/users/{senior['user_id']}", headers=bearer(senior))
    assert own.status_code == 200
    assert "password" not in own.json()
    assert client.get(f"/chores/senior/{senior['user_id']}", headers=bearer(volunteer)).status_code == 403


def test_only_actual_participants_can_post_claim_and_complete(client, monkeypatch):
    monkeypatch.delenv("CHORE4MORE_TEST_MODE")
    monkeypatch.setenv("PILOT_INVITE_CODE", "invite-for-testing")
    senior = register(client, "senior", "senior.flow@test.com")
    volunteer = register(client, "volunteer", "volunteer.flow@test.com")
    other = register(client, "volunteer", "other.flow@test.com")

    form = {"senior_id": senior["user_id"], "title": "Water balcony plants",
            "description": "A small task", "location": "Setagaya, Tokyo"}
    assert client.post("/chores/post", data=form).status_code == 401
    assert client.post("/chores/post", data=form, headers=bearer(volunteer)).status_code == 403
    posted = client.post("/chores/post", data=form, headers=bearer(senior))
    assert posted.status_code == 200, posted.text
    chore_id = posted.json()["chore_id"]
    assert client.get("/chores/all").status_code == 401
    assert client.get("/chores/all", headers=bearer(senior)).status_code == 403

    url = f"/chores/{chore_id}/claim"
    assert client.post(url, params={"volunteer_id": volunteer["user_id"]},
                       headers=bearer(other)).status_code == 403
    assert client.post(url, params={"volunteer_id": volunteer["user_id"]},
                       headers=bearer(volunteer)).status_code == 200
    assert client.get(f"/chores/{chore_id}", headers=bearer(other)).status_code == 403
    assert client.post(f"/chores/{chore_id}/complete",
                       params={"volunteer_id": volunteer["user_id"]},
                       headers=bearer(other)).status_code == 403
    assert client.post(f"/chores/{chore_id}/complete",
                       headers=bearer(other)).status_code == 403
    finished = client.post(f"/chores/{chore_id}/complete",
                       params={"volunteer_id": volunteer["user_id"]},
                       headers=bearer(volunteer))
    assert finished.status_code == 200
    assert client.get(f"/users/{volunteer['user_id']}/stats",
                      headers=bearer(volunteer)).json()["points"] == 0
    assert client.post(f"/chores/{chore_id}/confirm", headers=bearer(volunteer)).status_code == 403
    assert client.post(f"/chores/{chore_id}/confirm", headers=bearer(senior)).status_code == 200
    assert client.post(f"/chores/{chore_id}/confirm", headers=bearer(senior)).status_code == 400
    assert client.get(f"/users/{volunteer['user_id']}/stats",
                      headers=bearer(volunteer)).json()["points"] == 50


def test_pilot_blocks_saved_photos_and_uses_salted_passwords(client, monkeypatch):
    monkeypatch.delenv("CHORE4MORE_TEST_MODE")
    monkeypatch.setenv("PILOT_INVITE_CODE", "invite-for-testing")
    senior = register(client, "senior", "senior.media@test.com")
    response = client.post("/chores/post", data={
        "senior_id": senior["user_id"], "title": "Test", "description": "Test",
    }, files={"images": ("private.jpg", b"photo", "image/jpeg")}, headers=bearer(senior))
    assert response.status_code == 400
    from models.database import get_db
    conn = get_db()
    stored = conn.execute("SELECT password FROM users WHERE id = ?",
                          (senior["user_id"],)).fetchone()[0]
    conn.close()
    assert stored.startswith("pbkdf2_sha256$")
    assert client.post("/users/login", json={
        "email": "senior.media@test.com", "password": "long-test-password",
    }).status_code == 200


def test_temporary_storage_cannot_open_registration(client, monkeypatch):
    monkeypatch.delenv("CHORE4MORE_TEST_MODE")
    monkeypatch.setenv("PILOT_INVITE_CODE", "invite-for-testing")
    monkeypatch.setenv("CHORE4MORE_DB_PATH", "/tmp/chore4more.db")
    response = client.post("/users/register", json={
        "name": "Test", "email": "test@test.com", "role": "senior",
        "password": "long-test-password", "invite_code": "invite-for-testing",
    })
    assert response.status_code == 503
