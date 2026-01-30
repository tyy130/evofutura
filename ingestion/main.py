"""
Evofutura Ingestion Pipeline - Main Entry Point.

Orchestrates the full ingestion workflow:
1. Fetch stories from all sources (NewsData.io, NewsAPI.ai, RSS)
2. Apply Kill List filter (already done per-source)
3. Deduplicate against history
4. Upload images to Cloudinary
5. Generate Hugo markdown
"""

import os
import sys
import logging
from pathlib import Path

from ingestion.sources.newsdata import NewsDataClient
from ingestion.sources.newsapi_ai import NewsAPIAIClient
from ingestion.sources.rss import RSSClient
from ingestion.images import ImageHandler
from ingestion.publisher import Publisher

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def check_required_env_vars() -> bool:
    """Check that required environment variables are set."""
    required = ["CLOUDINARY_URL"]
    optional_sources = ["NEWSDATA_API_KEY", "NEWSAPI_AI_KEY"]
    
    missing = [var for var in required if not os.environ.get(var)]
    if missing:
        logger.error(f"Missing required environment variables: {missing}")
        return False
    
    # At least one news source should be configured
    has_source = any(os.environ.get(var) for var in optional_sources)
    if not has_source:
        logger.warning(
            "No news API keys configured. Only RSS feeds will be used. "
            f"Set one of: {optional_sources}"
        )
    
    return True


def fetch_all_stories() -> list[dict]:
    """Fetch stories from all configured sources."""
    all_stories = []
    seen_ids = set()
    
    def add_unique(stories: list[dict]) -> None:
        for story in stories:
            story_id = story.get("id")
            if story_id and story_id not in seen_ids:
                seen_ids.add(story_id)
                all_stories.append(story)
    
    # NewsData.io
    if os.environ.get("NEWSDATA_API_KEY"):
        try:
            client = NewsDataClient()
            stories = client.fetch_technology_news(max_results=30)
            add_unique(stories)
            logger.info(f"NewsData.io: {len(stories)} stories")
        except Exception as e:
            logger.error(f"NewsData.io failed: {e}")
    
    # NewsAPI.ai
    if os.environ.get("NEWSAPI_AI_KEY"):
        try:
            client = NewsAPIAIClient()
            stories = client.fetch_all_concepts(days_back=1, max_per_concept=15)
            add_unique(stories)
            logger.info(f"NewsAPI.ai: {len(stories)} stories")
        except Exception as e:
            logger.error(f"NewsAPI.ai failed: {e}")
    
    # RSS feeds (always available)
    try:
        client = RSSClient()
        stories = client.fetch_all_feeds(max_per_feed=10)
        add_unique(stories)
        logger.info(f"RSS feeds: {len(stories)} stories")
    except Exception as e:
        logger.error(f"RSS feeds failed: {e}")
    
    return all_stories


def process_images(stories: list[dict]) -> list[dict]:
    """Upload images to Cloudinary and add URLs to stories."""
    try:
        handler = ImageHandler()
    except ValueError as e:
        logger.error(f"Cloudinary not configured: {e}")
        return stories  # Return stories without image processing
    
    processed = []
    for story in stories:
        try:
            processed.append(handler.process_story_image(story))
        except Exception as e:
            logger.warning(f"Image processing failed for {story.get('id')}: {e}")
            processed.append(story)
    
    return processed


def main() -> int:
    """Main entry point."""
    logger.info("=" * 60)
    logger.info("Evofutura Ingestion Pipeline")
    logger.info("=" * 60)
    
    # Check environment
    if not check_required_env_vars():
        return 1
    
    # Determine project root (for local dev vs CI)
    project_root = Path(os.environ.get("PROJECT_ROOT", Path.cwd()))
    
    # Fetch stories
    logger.info("Fetching stories from all sources...")
    stories = fetch_all_stories()
    logger.info(f"Total stories fetched: {len(stories)}")
    
    if not stories:
        logger.warning("No stories fetched. Exiting.")
        return 0
    
    # Process images
    logger.info("Processing images...")
    stories = process_images(stories)
    
    # Publish to Hugo
    logger.info("Publishing to Hugo...")
    publisher = Publisher(project_root)
    published = publisher.publish_stories(stories)
    
    logger.info("=" * 60)
    logger.info(f"Pipeline complete. Published {len(published)} articles.")
    logger.info("=" * 60)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
