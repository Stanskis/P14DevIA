import os

from dotenv import load_dotenv
from pydantic_ai import Agent, RunContext
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


def build_system_prompt(news) -> str:
    """Construit le prompt système pour l'agent d'actualités."""
    return (
        f"{AGENT_PROMPT}\n\n"
        f"Les actualités du jour. Utilise-les pour répondre aux questions "
        f"sur l'actualité : {news}"
    )
