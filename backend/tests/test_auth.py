def test_login_wrong_password(client):
    res = client.post(
        "/login", json={"email": "a@test.com", "password": "nope"})
    assert res.status_code == 401


def test_chats_require_token(client):
    assert client.get("/chats").status_code in (401, 403)
    assert client.post("/chats").status_code in (401, 403)


def test_invalid_token_rejected(client):
    res = client.get("/chats", headers={"Authorization": "Bearer garbage"})
    assert res.status_code == 401


def test_cannot_read_other_users_chat(client, headers_a, headers_b):
    chat_id = client.post("/chats", headers=headers_a).json()["id"]
    res = client.get(f"/chats/{chat_id}", headers=headers_b)
    assert res.status_code == 403


def test_cannot_post_in_other_users_chat(client, headers_a, headers_b):
    chat_id = client.post("/chats", headers=headers_a).json()["id"]
    res = client.post(
        f"/chats/{chat_id}/messages", json={"content": "hack"}, headers=headers_b
    )
    assert res.status_code == 403


def test_unknown_chat_404(client, headers_a):
    assert client.get("/chats/9999", headers=headers_a).status_code == 404
