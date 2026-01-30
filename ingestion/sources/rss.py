"""
RSS feed ingestion for high-signal sources.

Scrapes RSS feeds from:
- arXiv cs.RO (robotics papers)
- OpenAI blog
- Boston Dynamics blog
"""

import logging
from typing import Optional
from datetime import datetime
from time import mktime

import feedparser

from ingestion.filters import is_rejected

logger = logging.getLogger(__name__)


# High-signal RSS feeds
RSS_FEEDS = {
    "arxiv_robotics": {
        "url": "http://export.arxiv.org/rss/cs.RO",
        "name": "arXiv cs.RO",
    },
    "openai_blog": {
        "url": "https://openai.com/blog/rss/",
        "name": "OpenAI Blog",
    },
    "boston_dynamics": {
        "url": "https://bostondynamics.com/feed/",
        "name": "Boston Dynamics",
    },
    "deepmind_blog": {
        "url": "https://deepmind.google/blog/rss.xml",
        "name": "Google DeepMind",
    },
}


class RSSClient:
    """Client for RSS feed ingestion."""
    
    def __init__(self, feeds: Optional[dict] = None):
        """
        Initialize client.
        
        Args:
            feeds: Custom feed config. Defaults to RSS_FEEDS.
        """
        self.feeds = feeds or RSS_FEEDS
    
    def fetch_feed(self, feed_key: str, max_results: int = 20) -> list[dict]:
        """
        Fetch articles from a single RSS feed.
        
        Args:
            feed_key: Key from feeds dict
            max_results: Maximum articles to return
            
        Returns:
            List of normalized story dicts
        """
        feed_config = self.feeds.get(feed_key)
        if not feed_config:
            logger.error(f"Unknown feed: {feed_key}")
            return []
        
        try:
            feed = feedparser.parse(feed_config["url"])
        except Exception as e:
            logger.error(f"RSS parse error for {feed_key}: {e}")
            return []
        
        if feed.bozo and feed.bozo_exception:
            logger.warning(f"RSS feed {feed_key} has issues: {feed.bozo_exception}")
        
        stories = []
        for entry in feed.entries[:max_results]:
            story = self._normalize(entry, feed_config["name"])
            
            # Apply Kill List filter
            rejected, reason = is_rejected(
                story["title"],
                story.get("description")
            )
            if rejected:
                logger.debug(f"Rejected story ({reason}): {story['title'][:50]}...")
                continue
            
            stories.append(story)
        
        logger.info(f"Fetched {len(stories)} stories from {feed_config['name']}")
        return stories
    
    def fetch_all_feeds(self, max_per_feed: int = 10) -> list[dict]:
        """
        Fetch articles from all configured RSS feeds.
        
        Args:
            max_per_feed: Maximum articles per feed
            
        Returns:
            Combined list of normalized story dicts
        """
        all_stories = []
        
        for feed_key in self.feeds:
            stories = self.fetch_feed(feed_key, max_results=max_per_feed)
            all_stories.extend(stories)
        
        return all_stories
    
    def _normalize(self, entry: dict, source_name: str) -> dict:
        """Normalize feedparser entry to common schema."""
        # Extract image from media content or enclosures
        image_url = None
        if hasattr(entry, "media_content") and entry.media_content:
            for media in entry.media_content:
                if media.get("medium") == "image" or "image" in media.get("type", ""):
                    image_url = media.get("url")
                    break
        if not image_url and hasattr(entry, "enclosures"):
            for enc in entry.enclosures:
                if "image" in enc.get("type", ""):
                    image_url = enc.get("href")
                    break
        
        return {
            "id": entry.get("id") or entry.get("link"),
            "title": entry.get("title", ""),
            "description": entry.get("summary"),
            "content": entry.get("content", [{}])[0].get("value") if entry.get("content") else None,
            "link": entry.get("link"),
            "image_url": image_url,
            "source_id": source_name.lower().replace(" ", "_"),
            "source_name": source_name,
            "pub_date": self._parse_date(entry),
            "categories": [t.get("term") for t in entry.get("tags", [])],
            "origin": "rss",
        }
    
    def _parse_date(self, entry: dict) -> Optional[datetime]:
        """Parse date from feedparser entry."""
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            try:
                return datetime.fromtimestamp(mktime(entry.published_parsed))
            except (TypeError, ValueError):
                pass
        if hasattr(entry, "updated_parsed") and entry.updated_parsed:
            try:
                return datetime.fromtimestamp(mktime(entry.updated_parsed))
            except (TypeError, ValueError):
                pass
        return None
