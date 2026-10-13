from src.models import Chat
from pydantic_ai.models.test import TestModel

from src.agent import news_agent


def test_agent_calls_search_tool(client, headers_a, session):
    chat_id = client.post("/chats", headers=headers_a).json()["id"]
    model = TestModel(call_tools=["search_news_tool"],
                      custom_output_text="Voici")

    with news_agent.override(model=model):
        res = client.post(
            f"/chats/{chat_id}/messages",
            json={"content": "Plus d'infos sur les retraites"},
            headers=headers_a,
        )

    assert res.status_code == 200
    # l'utilisateur ne voit que la question et la réponse
    assert [m["role"] for m in res.json()["messages"]] == ["user", "assistant"]
    # mais l'outil a bien été appelé : il est dans l'historique sauvegardé
    assert "search_news_tool" in str(session.get(Chat, chat_id).messages)


def test_create_chat(client, headers_a):
    res = client.post("/chats", headers=headers_a)
    assert res.status_code == 201
    assert "id" in res.json()


def test_send_message_returns_llm_answer(client, headers_a):
    chat_id = client.post("/chats", headers=headers_a).json()["id"]

    res = client.post(
        f"/chats/{chat_id}/messages", json={"content": "Salut"}, headers=headers_a
    )

    assert res.status_code == 200
    messages = res.json()["messages"]
    assert messages[0] == {"role": "user", "content": "Salut"}
    assert messages[-1] == {"role": "assistant", "content": "Réponse de test"}


def test_history_is_kept_between_messages(client, headers_a):
    chat_id = client.post("/chats", headers=headers_a).json()["id"]
    client.post(f"/chats/{chat_id}/messages",
                json={"content": "Un"}, headers=headers_a)
    client.post(f"/chats/{chat_id}/messages",
                json={"content": "Deux"}, headers=headers_a)

    res = client.get(f"/chats/{chat_id}", headers=headers_a)

    assert len(res.json()["messages"]) == 4


def test_system_prompt_is_hidden(client, headers_a):
    chat_id = client.post("/chats", headers=headers_a).json()["id"]
    res = client.post(
        f"/chats/{chat_id}/messages", json={"content": "Salut"}, headers=headers_a
    )

    contents = [m["content"] for m in res.json()["messages"]]
    assert not any("assistant IA de NewsFoundry" in c for c in contents)


def test_system_prompt_saved_and_frozen(client, headers_a, session):
    chat_id = client.post("/chats", headers=headers_a).json()["id"]
    client.post(f"/chats/{chat_id}/messages",
                json={"content": "Salut"}, headers=headers_a)

    saved = session.get(Chat, chat_id).system_prompt
    assert "Titre test" in saved

    client.post(f"/chats/{chat_id}/messages",
                json={"content": "Encore"}, headers=headers_a)
    session.expire_all()
    assert session.get(Chat, chat_id).system_prompt == saved
