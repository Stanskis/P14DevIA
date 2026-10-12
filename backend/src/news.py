import os
import httpx
from datetime import datetime, timedelta

TOP_NEWS_URL = "https://api.worldnewsapi.com/top-news"
SEARCH_URL = "https://api.worldnewsapi.com/search-news"


async def fetch_top_news(country: str = "fr", language: str = "fr", limit: int = 10) -> str | None:
    """Retourne titres + résumés des actualités du jour"""
    api_key = os.getenv("WORLD_NEWS_API_KEY")
    if not api_key:
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(
                TOP_NEWS_URL,
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


async def search_news(query: str, number: int = 5, language: str = "fr", days: int | None = None) -> list[dict] | None:
    """Appelle /search-news. Retourne None en cas d'échec"""
    api_key = os.getenv("WORLD_NEWS_API_KEY")
    if not api_key:
        return None

    params = {
        "text": query,
        "language": language,
        "number": number,
        "sort": "publish-time",
        "sort-direction": "DESC",
    }

    if days:
        since = datetime.now() - timedelta(days=days)
        params["earliest-publish-date"] = since.strftime("%Y-%m-%d")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(SEARCH_URL, params=params, headers={"x-api-key": api_key})
            res.raise_for_status()
    except httpx.HTTPError:
        return None
    return res.json().get("news", [])
