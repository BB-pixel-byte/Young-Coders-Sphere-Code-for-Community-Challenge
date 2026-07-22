def analytics_headers(client):
    response = client.post(
        "/analytics/login", json={"password": "portfolio-test-password"}
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['token']}"}


class TestAnalyticsAccess:
    def test_wrong_password_is_rejected(self, client):
        response = client.post("/analytics/login", json={"password": "wrong"})
        assert response.status_code == 401

    def test_summary_requires_private_token(self, client):
        response = client.get("/analytics/summary")
        assert response.status_code == 401

    def test_valid_password_unlocks_summary(self, client):
        response = client.get(
            "/analytics/summary", headers=analytics_headers(client)
        )
        assert response.status_code == 200
        assert response.json()["traffic"]["unique_visitors"] == 0


class TestAnalyticsTracking:
    def test_anonymous_visits_and_returning_sessions(self, client):
        first = {
            "visitor_id": "visitor0001",
            "session_id": "session0001",
            "path": "/",
            "referrer_host": "example.com",
        }
        assert client.post("/analytics/visit", json=first).status_code == 204
        # React Strict Mode can issue the same event twice; it should be deduplicated.
        assert client.post("/analytics/visit", json=first).status_code == 204
        assert client.post(
            "/analytics/visit",
            json={**first, "session_id": "session0002", "path": "/register"},
        ).status_code == 204
        assert client.post(
            "/analytics/visit",
            json={
                "visitor_id": "visitor0002",
                "session_id": "session0003",
                "path": "/",
                "referrer_host": "",
            },
        ).status_code == 204

        summary = client.get(
            "/analytics/summary", headers=analytics_headers(client)
        ).json()
        assert summary["traffic"] == {
            "unique_visitors": 2,
            "sessions": 3,
            "page_views": 3,
            "returning_visitors": 1,
        }
        assert summary["sources"][0]["visitors"] >= 1

    def test_registration_and_core_actions_are_counted(
        self, client, senior_user, volunteer_user
    ):
        chore = client.post(
            "/chores/post",
            data={
                "senior_id": senior_user,
                "title": "Move a plant pot",
                "description": "Move it onto the balcony",
            },
        ).json()["chore_id"]
        client.post(
            f"/chores/{chore}/claim", params={"volunteer_id": volunteer_user}
        )
        client.post(
            f"/chores/{chore}/complete", params={"volunteer_id": volunteer_user}
        )

        summary = client.get(
            "/analytics/summary", headers=analytics_headers(client)
        ).json()
        assert summary["users"]["registered"] == 2
        assert summary["users"]["activated"] == 2
        assert summary["chores"] == {"posted": 1, "claimed": 1, "completed": 1}
        assert summary["rates"]["account_activation"] == 100.0
        assert summary["rates"]["chore_completion"] == 100.0

    def test_csv_snapshot_contains_aggregate_metrics(self, client):
        response = client.get(
            "/analytics/export.csv", headers=analytics_headers(client)
        )
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/csv")
        assert "Unique Visitors" in response.text
        assert "Date (UTC)" in response.text
