"""End-to-end regression test for the public Chore4More MVP journey."""


def test_senior_to_volunteer_to_completion_persists(client):
    senior_email = "senior.journey@test.com"
    volunteer_email = "volunteer.journey@test.com"
    second_volunteer_email = "volunteer2.journey@test.com"
    password = "demo-password"

    # 1) Senior account can be created and signed back into.
    r = client.post("/users/register", json={
        "name": "Maya Senior", "email": senior_email, "password": password, "role": "senior"
    })
    assert r.status_code == 200
    senior_id = r.json()["user_id"]
    r = client.post("/users/login", json={"email": senior_email, "password": password})
    assert r.status_code == 200
    assert r.json()["user_id"] == senior_id

    # 2) Senior posts a realistic chore.
    r = client.post("/chores/post", data={
        "senior_id": str(senior_id),
        "title": "Help carry groceries",
        "description": "Please help carry two grocery bags from the lobby to my apartment.",
        "location": "Setagaya, Tokyo",
    })
    assert r.status_code == 200
    chore_id = r.json()["chore_id"]

    # 3) Volunteer account can be created and the newly posted chore is discoverable.
    r = client.post("/users/register", json={
        "name": "Ken Volunteer", "email": volunteer_email, "password": password, "role": "volunteer"
    })
    assert r.status_code == 200
    volunteer_id = r.json()["user_id"]
    r = client.post("/users/login", json={"email": volunteer_email, "password": password})
    assert r.status_code == 200
    assert r.json()["user_id"] == volunteer_id

    r = client.get("/chores/all")
    assert r.status_code == 200
    assert chore_id in {item["id"] for item in r.json()}

    # 4) Volunteer claims it. The atomic status gate removes it from the open board.
    r = client.post(f"/chores/{chore_id}/claim", params={"volunteer_id": volunteer_id})
    assert r.status_code == 200
    r = client.get("/chores/all")
    assert chore_id not in {item["id"] for item in r.json()}

    # 5) A second volunteer cannot take the same chore.
    r = client.post("/users/register", json={
        "name": "Aki Volunteer", "email": second_volunteer_email, "password": password, "role": "volunteer"
    })
    second_volunteer_id = r.json()["user_id"]
    r = client.post(f"/chores/{chore_id}/claim", params={"volunteer_id": second_volunteer_id})
    assert r.status_code == 400

    # 6) Both dashboards' backing endpoints see the claimed state from SQLite.
    r = client.get(f"/chores/senior/{senior_id}")
    senior_view = next(item for item in r.json() if item["id"] == chore_id)
    assert senior_view["status"] == "claimed"
    assert senior_view["volunteer_id"] == volunteer_id

    r = client.get(f"/chores/volunteer/{volunteer_id}")
    volunteer_view = next(item for item in r.json() if item["id"] == chore_id)
    assert volunteer_view["status"] == "claimed"

    # 7) Claiming volunteer completes it and receives points.
    r = client.post(f"/chores/{chore_id}/complete", params={"volunteer_id": volunteer_id})
    assert r.status_code == 200
    r = client.get(f"/users/{volunteer_id}/stats")
    assert r.json()["points"] == 50
    assert r.json()["completed_chores"] == 1

    # 8) Simulate refresh/re-login: fresh reads still show the persisted completed state.
    r = client.post("/users/login", json={"email": senior_email, "password": password})
    assert r.status_code == 200
    r = client.get(f"/chores/senior/{senior_id}")
    senior_view = next(item for item in r.json() if item["id"] == chore_id)
    assert senior_view["status"] == "done"

    r = client.post("/users/login", json={"email": volunteer_email, "password": password})
    assert r.status_code == 200
    r = client.get(f"/chores/volunteer/{volunteer_id}")
    volunteer_view = next(item for item in r.json() if item["id"] == chore_id)
    assert volunteer_view["status"] == "done"
