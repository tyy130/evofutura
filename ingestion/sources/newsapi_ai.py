"""
NewsAPI.ai (EventRegistry) client for semantic news filtering.

Uses concept-based queries to find articles about specific topics
like "Generative AI" vs just keyword matching.
"""

import os
import logging
from typing import Optional
from datetime import datetime, timedelta

from eventregistry import EventRegistry, QueryArticlesIter, QueryItems

from ingestion.filters import is_rejected

logger = logging.getLogger(__name__)


class NewsAPIAIClient:
    """Client for NewsAPI.ai (EventRegistry) API."""
    
    # Concept URIs for semantic filtering
    CONCEPTS = {
        "generative_ai": "http://en.wikipedia.org/wiki/Generative_artificial_intelligence",
        "robotics": "http://en.wikipedia.org/wiki/Robotics",
        "artificial_intelligence": "http://en.wikipedia.org/wiki/Artificial_intelligence",
        "machine_learning": "http://en.wikipedia.org/wiki/Machine_learning",
        "autonomous_vehicles": "http://en.wikipedia.org/wiki/Self-driving_car",
    }
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize client.
        
        Args:
            api_key: NewsAPI.ai API key. Falls back to NEWSAPI_AI_KEY env var.
        """
        api_key = api_key or os.environ.get("NEWSAPI_AI_KEY")
        if not api_key:
            raise ValueError(
                "NewsAPI.ai API key required. "
                "Set NEWSAPI_AI_KEY environment variable."
            )
        self.er = EventRegistry(apiKey=api_key)
    
    def fetch_by_concept(
        self,
        concept_key: str,
        days_back: int = 1,
        max_results: int = 50
    ) -> list[dict]:
        """
        Fetch articles by semantic concept.
        
        Args:
            concept_key: Key from CONCEPTS dict (e.g., "generative_ai")
            days_back: How many days back to search
            max_results: Maximum articles to return
            
        Returns:
            List of normalized story dicts
        """
        concept_uri = self.CONCEPTS.get(concept_key)
        if not concept_uri:
            logger.error(f"Unknown concept: {concept_key}")
            return []
        
        date_start = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
        
        try:
            query = QueryArticlesIter(
                conceptUri=concept_uri,
                dateStart=date_start,
                lang="eng",
            )
            
            stories = []
            for article in query.execQuery(self.er, maxItems=max_results):
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
            
            logger.info(f"Fetched {len(stories)} stories for concept '{concept_key}'")
            return stories
            
        except Exception as e:
            logger.error(f"NewsAPI.ai API error: {e}")
            return []
    
    def fetch_all_concepts(self, days_back: int = 1, max_per_concept: int = 20) -> list[dict]:
        """
        Fetch articles for all configured concepts.
        
        Args:
            days_back: How many days back to search
            max_per_concept: Maximum articles per concept
            
        Returns:
            Combined list of normalized story dicts (deduplicated by ID)
        """
        seen_ids = set()
        all_stories = []
        
        for concept_key in self.CONCEPTS:
            stories = self.fetch_by_concept(
                concept_key,
                days_back=days_back,
                max_results=max_per_concept
            )
            for story in stories:
                if story["id"] not in seen_ids:
                    seen_ids.add(story["id"])
                    all_stories.append(story)
        
        return all_stories
    
    def _normalize(self, article: dict) -> dict:
        """Normalize EventRegistry article to common schema."""
        return {
            "id": article.get("uri", article.get("url")),
            "title": article.get("title", ""),
            "description": article.get("body", "")[:500] if article.get("body") else None,
            "content": article.get("body"),
            "link": article.get("url"),
            "image_url": article.get("image"),
            "source_id": article.get("source", {}).get("uri"),
            "source_name": article.get("source", {}).get("title", "Unknown"),
            "pub_date": self._parse_date(article.get("dateTime")),
            "categories": [c.get("label") for c in article.get("categories", [])],
            "origin": "newsapi_ai",
        }
    
    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse date string to datetime."""
        if not date_str:
            return None
        try:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            return None
