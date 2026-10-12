import os

from dotenv import load_dotenv
from pydantic_ai import Agent, RunContext
from src.news import search_news
load_dotenv()

AGENT_PROMPT = (
    "Vous êtes l'assistant IA de NewsFoundry, un outil spécialisé dans la revue de presse "
    "et l'analyse d'actualités. Vos réponses doivent être concises, professionnelles, "
    "factuelles et rédigées en français. "
    "IMPORTANT : réponds toujours en texte brut, sans aucun formatage Markdown "
    "(pas de **, *, #, _). Utilise uniquement des tirets simples (-) pour les listes."
)

news_agent = Agent(
    os.getenv("LLM_MODEL"),
    deps_type=str,
)


@news_agent.instructions
def instructions(ctx: RunContext[str]) -> str:
    return ctx.deps


@news_agent.tool_plain
async def search_news_tool(query: str, days: int | None = None) -> str:
    """Recherche des articles de presse récents sur un sujet précis.

    À utiliser quand l'utilisateur demande plus d'informations ou de détails
    sur un sujet, ou une actualité absente des actualités du jour.

    Args:
        query: mots-clés de la recherche, de préférence en français (ex: "réforme des retraites").
        days: ne garder que les articles des N derniers jours (optionnel).
    """
    articles = await search_news(query, number=5, days=days)
    if articles is None:
        return "La recherche d'articles est indisponible pour le moment."
    if not articles:
        return f"Aucun article trouvé pour « {query} »."

    lines = []
    for a in articles:
        summary = a.get("summary") or (a.get("text") or "")[:300]
        date = (a.get("publish_date") or "")[:10]
        lines.append(
            f"- {a.get('title')} ({date}) : {summary} [{a.get('url')}]")
    return "\n".join(lines)


def build_system_prompt(news) -> str:
    """Construit le prompt système pour l'agent d'actualités."""
    return (
        f"{AGENT_PROMPT}\n\n"
        f"Les actualités du jour. Utilise-les pour répondre aux questions "
        f"sur l'actualité : {news}"
    )
