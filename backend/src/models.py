from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Column, Field, JSON, SQLModel
from pydantic import field_validator


def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)


def to_display_messages(raw: list[dict]) -> list[dict]:
    result = []
    for msg in raw:
        for part in msg.get("parts", []):
            kind = part.get("part_kind")
            if kind == "user-prompt":
                result.append({"role": "user", "content": part["content"]})
            elif kind == "text":
                result.append(
                    {"role": "assistant", "content": part["content"]})
            # system-prompt, tool-call, tool-return are ignored for display
    return result


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str = Field()


class Chat(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=get_utc_now)
    messages: list[dict] = Field(default=[], sa_column=Column(JSON))
    system_prompt: str | None = Field(default=None)


class ChatResponse(SQLModel):
    id: int
    user_id: int
    created_at: datetime
    messages: list[dict]

    @field_validator("messages", mode="before")
    @classmethod
    def hide_internal_parts(cls, v):
        return to_display_messages(v or [])


class MessageRequest(SQLModel):
    content: str
