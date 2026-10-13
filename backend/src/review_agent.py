import os

from pydantic import BaseModel
from pydantic_ai import Agent


class ArticleSummary(BaseModel):
    title: str
    summary: str
    url: str | None = None


class PressReview(BaseModel):
    title: str
    summary: str  # synthèse générale
    articles: list[ArticleSummary]  # synthèse de chaque article cité


REVIEW_PROMPT = (
    "Vous êtes un rédacteur de revues de presse pour NewsFoundry. À partir de la "
    "discussion fournie, rédigez en français une revue de presse sur le thème demandé. "
    "Donnez un titre, une synthèse générale (quelques phrases) et une synthèse courte "
    "pour chaque article mentionné dans la discussion, avec son URL si elle est connue. "
    "N'inventez aucun article : utilisez uniquement ce qui apparaît dans la discussion."
)

review_agent = Agent(
    os.getenv("LLM_MODEL", "google:gemini-3.6-flash"),
    output_type=PressReview,
    instructions=REVIEW_PROMPT,  # output
)
