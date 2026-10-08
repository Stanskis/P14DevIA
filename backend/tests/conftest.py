import os

os.environ.setdefault("SECRET_KEY", "test-secret-key-test-secret-key-test")
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("GOOGLE_API_KEY", "fake")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from pydantic_ai import models  # noqa: E402
from pydantic_ai.models.test import TestModel  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402
from sqlmodel import Session, SQLModel, create_engine  # noqa: E402

from src.agent import news_agent  # noqa: E402
from src.database import get_session  # noqa: E402
from src.main import app  # noqa: E402
from src.models import User  # noqa: E402
from src.security import hash_password  # noqa: E402


models.ALLOW_MODEL_REQUESTS = False


@pytest.fixture
def session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as s:
        s.add(User(email="a@test.com", hashed_password=hash_password("pw-a")))
        s.add(User(email="b@test.com", hashed_password=hash_password("pw-b")))
        s.commit()
        yield s


@pytest.fixture
def client(session, monkeypatch):

    async def fake_news():
        return "Titre test\nRésumé test"

    monkeypatch.setattr(
        "src.routes.chats.fetch_top_news",
        fake_news,
    )

    app.dependency_overrides[get_session] = lambda: session

    with news_agent.override(
        model=TestModel(custom_output_text="Réponse de test")
    ):
        yield TestClient(app)

    app.dependency_overrides.clear()


def login(client, email, password):
    res = client.post("/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


@pytest.fixture
def headers_a(client):
    return login(client, "a@test.com", "pw-a")


@pytest.fixture
def headers_b(client):
    return login(client, "b@test.com", "pw-b")
