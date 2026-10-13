import asyncio
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic_ai.exceptions import ModelHTTPError
from pydantic_ai.messages import ModelMessage, ModelMessagesTypeAdapter
from sqlmodel import Session, select

from src.agent import news_agent, AGENT_PROMPT, build_system_prompt
from src.auth import get_current_user
from src.database import get_session
from src.models import Chat, ChatResponse, MessageRequest, User
from src.news import fetch_top_news

router = APIRouter(prefix="/chats", tags=["chats"])

RETRY_CODES = {429, 500, 503}


def get_own_chat(chat_id: int, user: User, session: Session) -> Chat:
    chat = session.get(Chat, chat_id)
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Discussion non trouvée",
        )
    if chat.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé",
        )
    return chat


async def with_retry(call, retries: int = 3):
    for attempt in range(retries):
        try:
            return await call()
        except ModelHTTPError as e:
            print("IA error", e.status_code, e.body)
            if e.status_code not in RETRY_CODES:
                raise
            if attempt == retries - 1:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Le service IA est temporairement indisponible, réessayez dans un instant.",
                )
            await asyncio.sleep(2 ** (attempt + 1))


async def run_agent(content: str, history: list[ModelMessage], system_prompt: str):
    return await with_retry(
        lambda: news_agent.run(
            content, message_history=history, deps=system_prompt)
    )


def load_history(chat: Chat) -> list[ModelMessage]:
    if not chat.messages:
        return []
    try:
        return ModelMessagesTypeAdapter.validate_python(chat.messages)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors du chargement de l'historique du chat",
        )


@router.get("", response_model=List[ChatResponse])
def get_user_chats(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    statement = (
        select(Chat)
        .where(Chat.user_id == current_user.id)
        .order_by(Chat.id.desc())
    )
    return session.exec(statement).all()


@router.post("", response_model=ChatResponse, status_code=status.HTTP_201_CREATED)
def create_chat(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    new_chat = Chat(user_id=current_user.id, messages=[])
    session.add(new_chat)
    session.commit()
    session.refresh(new_chat)
    return new_chat


@router.get("/{chat_id}", response_model=ChatResponse)
def get_chat(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return get_own_chat(chat_id, current_user, session)


@router.post("/{chat_id}/messages", response_model=ChatResponse)
async def send_message(
    chat_id: int,
    body: MessageRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    chat = get_own_chat(chat_id, current_user, session)

    # Reconstitution de l'historique pydantic-ai
    history: list[ModelMessage] = []
    if chat.messages:
        try:
            history = ModelMessagesTypeAdapter.validate_python(chat.messages)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erreur lors du chargement de l'historique du chat",
            )
    if not chat.system_prompt:
        news = await fetch_top_news()
        if news:
            chat.system_prompt = build_system_prompt(news)

    system_prompt = chat.system_prompt or AGENT_PROMPT

    # Exécution de l'agent IA avec l'historique
    result = await run_agent(body.content, history, system_prompt)

    # Sérialisation pour la colonne JSON / JSONB
    chat.messages = ModelMessagesTypeAdapter.dump_python(
        result.all_messages(), mode="json"
    )

    session.add(chat)
    session.commit()
    session.refresh(chat)
    return chat
