import os
import time

from dotenv import load_dotenv
from fastapi import HTTPException
from pydantic_ai import Agent
from pydantic_ai.exceptions import ModelHTTPError

load_dotenv()

SYSTEM_PROMPT = (
    "Vous êtes l'assistant IA de NewsFoundry, un outil spécialisé dans la revue de presse "
    "et l'analyse d'actualités. Vos réponses doivent être concises, professionnelles, "
    "factuelles et rédigées en français."
)

news_agent = Agent(
    os.getenv("LLM_MODEL"),
    system_prompt=SYSTEM_PROMPT,
)

RETRY_CODES = {429, 500, 503}


def run_agent_with_retry(prompt: str, retries: int = 3):
    for attempt in range(retries):
        try:
            return news_agent.run_sync(prompt)
        except ModelHTTPError as e:
            if e.status_code not in RETRY_CODES:
                raise
            if attempt == retries - 1:
                raise HTTPException(
                    status_code=503,
                    detail="Le service IA est temporairement indisponible, réessayez dans un instant.",
                )
            time.sleep(2 ** (attempt + 1))
