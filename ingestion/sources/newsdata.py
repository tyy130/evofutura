"""
NewsData.io client for technology news polling.

Fetches articles from the NewsData.io API with category filtering.
All stories pass through the Kill List filter before returning.
"""

import os
import logging
from typing import Optional
from datetime import datetime

import requests
from tenacity import retry, stop_after_attempt, wait_exponential

from ingestion.filters import is_rejected

logger = logging.getLogger(__name__)

NEWSDATA_BASE_URL = "https://newsdata.io/api/1/news"


class NewsDataClient:
    """Client for NewsData.io API."""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize client.
        
        Args:
            api_key: NewsData.io API key. Falls back to NEWSDATA_API_KEY env var.
        """
        self.api_key = api_key or os.environ.get("NEWSDATA_API_KEY")
        if not self.api_key:
            raise ValueError(
                "NewsData.io API key required. "
                "Set NEWSDATA_API_KEY environment variable."
            )
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    def _fetch(self, params: dict) -> dict:
        """Make API request with retry logic."""
        params["apikey"] = self.api_key
        response = requests.get(NEWSDATA_BASE_URL, params=params, timeout=30)
        response.raise_for_status()
        return response.json()
    
    def fetch_technology_news(
        self,
        language: str = "en",
        country: Optional[str] = None,
        max_results: int = 50
    ) -> list[dict]:
        """
        Fetch technology news articles.
        
        Args:
            language: Language code (default: "en")
            country: Optional country code filter
            max_results: Maximum articles to return
            
        Returns:
            List of normalized story dicts
        """
        params = {
            "category": "technology",
            "language": language,
            "size": min(max_results, 50),  # API max is 50
        }
        if country:
            params["country"] = country
        
        try:
            data = self._fetch(params)
        except requests.RequestException as e:
            logger.error(f"NewsData.io API error: {e}")
            return []
        
        if data.get("status") != "success":
            logger.error(f"NewsData.io API returned error: {data}")
            return []
        
        stories = []
        for article in data.get("results", []):
            # Normalize to common schema
            story = self._normalize(article)
            
            # Apply Kill List filter
            rejected, reason = is_rejected(
                story["title"],
                story.get("description")
            )
            if rejected:
                logger.debug(f"Rejected story ({reason}): {story['title'][:50]}...")
                continue
            
            stories.append(story)
        
        logger.info(f"Fetched {len(stories)} stories from NewsData.io")
        return stories
    
    def _normalize(self, article: dict) -> dict:
        """Normalize NewsData.io article to common schema."""
        return {
            "id": article.get("article_id") or article.get("link"),
            "title": article.get("title", ""),
            "description": article.get("description"),
            "content": article.get("content"),
            "link": article.get("link"),
            "image_url": article.get("image_url"),
            "source_id": article.get("source_id"),
            "source_name": article.get("source_name", article.get("source_id", "Unknown")),
            "pub_date": self._parse_date(article.get("pubDate")),
            "categories": article.get("category", []),
            "origin": "newsdata",
        }
    
    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse date string to datetime."""
        if not date_str:
            return None
        try:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            return None
