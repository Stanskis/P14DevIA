from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from src.auth import get_current_user
from src.database import get_session
from src.models import Chat, ReviewRequest, ReviewResponse, User, get_utc_now
from src.review_agent import review_agent
from src.routes.chats import get_own_chat, load_history, with_retry

router = APIRouter(tags=["reviews"])


def to_review(chat: Chat) -> ReviewResponse:
    return ReviewResponse(
        chat_id=chat.id,
        title=chat.review_title,
        summary=chat.review_summary,
        articles=chat.review_articles or [],
        created_at=chat.review_created_at,
    )


@router.post("/chats/{chat_id}/review", response_model=ReviewResponse)
async def generate_review(
    chat_id: int,
    body: ReviewRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    chat = get_own_chat(chat_id, current_user, session)
    history = load_history(chat)
    if not history:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La discussion est vide : rien à synthétiser.",
        )

    result = await with_retry(
        lambda: review_agent.run(
            f"Rédigez une revue de presse sur le thème : {body.theme}",
            message_history=history,
        )
    )
    review = result.output

    chat.review_title = review.title
    chat.review_summary = review.summary
    chat.review_articles = [a.model_dump() for a in review.articles]
    chat.review_created_at = get_utc_now()
    session.add(chat)
    session.commit()
    session.refresh(chat)
    return to_review(chat)


@router.get("/reviews", response_model=list[ReviewResponse])
def list_reviews(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    chats = session.exec(
        select(Chat)
        .where(Chat.user_id == current_user.id, Chat.review_title.is_not(None))
        .order_by(Chat.review_created_at.desc())
    ).all()
    return [to_review(c) for c in chats]
