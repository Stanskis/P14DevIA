import os
import httpx
import re

URL = "https://api.worldnewsapi.com/top-news"


async def fetch_top_news(country: str = "fr", language: str = "fr", limit: int = 10) -> str | None:
    """Retourne titres + résumés des actualités du jour"""
    api_key = os.getenv("WORLD_NEWS_API_KEY")
    if not api_key:
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(
                URL,
                params={
                    "source-country": country,
                    "language": language,
                    "max-news-per-cluster": 1,
                },
                headers={"x-api-key": api_key},
            )
            res.raise_for_status()
    except httpx.HTTPError:
        return None

    lines = []
    for cluster in res.json().get("top_news", [])[:limit]:
        for article in cluster.get("news", [])[:1]:
            title = (article.get("title"))
            summary = (article.get("summary")
                       or article.get("text"))[:300]
            lines.append(f"- {title} : {summary}")
    return "\n".join(lines) or None
