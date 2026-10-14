"""Piste 1 : comportement en cas d'erreur du LLM (secours, délai maximal, rien d'enregistré)."""
import asyncio
import time

from pydantic_ai.exceptions import ModelHTTPError
from pydantic_ai.models.fallback import FallbackModel
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.models.test import TestModel

from src.agent import news_agent


def failing(messages, info):
    raise ModelHTTPError(
        status_code=503, model_name="primary", body="high demand")


async def slow(messages, info):
    await asyncio.sleep(2)
    raise ModelHTTPError(
        status_code=503, model_name="primary", body="high demand")


def new_chat(client, headers):
    return client.post("/chats", headers=headers).json()["id"]


def post_message(client, headers, chat_id):
    return client.post(
        f"/chats/{chat_id}/messages", json={"content": "Salut"}, headers=headers
    )


def test_fallback_model_answers_when_primary_fails(client, headers_a):
    chat_id = new_chat(client, headers_a)
    model = FallbackModel(
        FunctionModel(failing), TestModel(
            custom_output_text="Réponse de secours")
    )

    start = time.perf_counter()
    with news_agent.override(model=model):
        res = post_message(client, headers_a, chat_id)
    elapsed = time.perf_counter() - start

    assert res.status_code == 200
    assert res.json()["messages"][-1]["content"] == "Réponse de secours"
    assert elapsed < 1


def test_503_quickly_when_all_models_fail(client, headers_a, monkeypatch):
    monkeypatch.setattr("src.routes.chats.RETRY_PAUSE_SECONDS", 0)
    chat_id = new_chat(client, headers_a)
    model = FallbackModel(FunctionModel(failing), FunctionModel(failing))

    start = time.perf_counter()
    with news_agent.override(model=model):
        res = post_message(client, headers_a, chat_id)
    elapsed = time.perf_counter() - start

    assert res.status_code == 503
    assert elapsed < 8


def test_503_when_llm_exceeds_time_budget(client, headers_a, monkeypatch):
    monkeypatch.setattr("src.routes.chats.LLM_TIMEOUT_SECONDS", 0.2)
    chat_id = new_chat(client, headers_a)

    start = time.perf_counter()
    with news_agent.override(model=FunctionModel(slow)):
        res = post_message(client, headers_a, chat_id)
    elapsed = time.perf_counter() - start

    assert res.status_code == 503
    assert "trop de temps" in res.json()["detail"]
    assert elapsed < 2


def test_failed_message_is_not_saved(client, headers_a, monkeypatch):
    monkeypatch.setattr("src.routes.chats.RETRY_PAUSE_SECONDS", 0)
    chat_id = new_chat(client, headers_a)

    with news_agent.override(model=FunctionModel(failing)):
        res = post_message(client, headers_a, chat_id)
    assert res.status_code == 503

    history = client.get(f"/chats/{chat_id}",
                         headers=headers_a).json()["messages"]
    assert history == []


def failing_404(messages, info):
    raise ModelHTTPError(
        status_code=404, model_name="primary", body="not found")


def test_503_when_all_models_404(client, headers_a):
    chat_id = new_chat(client, headers_a)
    model = FallbackModel(FunctionModel(failing_404),
                          FunctionModel(failing_404))

    start = time.perf_counter()
    with news_agent.override(model=model):
        res = post_message(client, headers_a, chat_id)
    elapsed = time.perf_counter() - start

    assert res.status_code == 503
    assert elapsed < 1


def test_503_delay_with_real_pauses(client, headers_a):
    """Mesure pour la colonne « Après » : pauses réelles de 1 s + 2 s."""
    chat_id = new_chat(client, headers_a)
    model = FallbackModel(FunctionModel(failing), FunctionModel(failing))

    start = time.perf_counter()
    with news_agent.override(model=model):
        res = post_message(client, headers_a, chat_id)
    elapsed = time.perf_counter() - start
    print(f"DELAI_503={elapsed:.2f}s")

    assert res.status_code == 503
    assert elapsed < 8


def test_fallback_is_logged(client, headers_a, caplog):
    caplog.set_level("INFO", logger="uvicorn.error")
    chat_id = new_chat(client, headers_a)
    model = FallbackModel(
        FunctionModel(failing), TestModel(
            custom_output_text="Réponse de secours")
    )

    with news_agent.override(model=model):
        res = post_message(client, headers_a, chat_id)

    assert res.status_code == 200
    assert "chat_message" in caplog.text
    assert "model=" in caplog.text
