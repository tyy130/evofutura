"""
Hugo markdown publisher.

Generates Hugo-compatible markdown files from processed stories.
Manages history.json to prevent duplicate processing.
"""

import os
import json
import logging
from pathlib import Path
from typing import Optional
from datetime import datetime

import frontmatter
from slugify import slugify

logger = logging.getLogger(__name__)

# Paths relative to project root
CONTENT_DIR = Path("content/posts")
HISTORY_FILE = Path("data/history.json")


class Publisher:
    """Generates Hugo markdown content from stories."""
    
    def __init__(self, project_root: Optional[Path] = None):
        """
        Initialize publisher.
        
        Args:
            project_root: Project root directory. Defaults to cwd.
        """
        self.root = project_root or Path.cwd()
        self.content_dir = self.root / CONTENT_DIR
        self.history_file = self.root / HISTORY_FILE
        
        # Ensure content directory exists
        self.content_dir.mkdir(parents=True, exist_ok=True)
        
        # Load history
        self.history = self._load_history()
    
    def _load_history(self) -> set:
        """Load processed story IDs from history file."""
        if not self.history_file.exists():
            return set()
        
        try:
            with open(self.history_file, "r") as f:
                data = json.load(f)
                return set(data.get("processed_ids", []))
        except (json.JSONDecodeError, IOError) as e:
            logger.warning(f"Failed to load history: {e}")
            return set()
    
    def _save_history(self) -> None:
        """Save processed story IDs to history file."""
        try:
            self.history_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.history_file, "w") as f:
                json.dump({"processed_ids": list(self.history)}, f, indent=2)
        except IOError as e:
            logger.error(f"Failed to save history: {e}")
    
    def is_processed(self, story_id: str) -> bool:
        """Check if a story has already been processed."""
        return story_id in self.history
    
    def publish_story(self, story: dict) -> Optional[Path]:
        """
        Generate Hugo markdown for a story.
        
        Args:
            story: Normalized story dict with required fields:
                - id: Unique identifier
                - title: Article title
                - description: Article summary
                - link: Original URL
                - source_name: Source publication
                - pub_date: Publication datetime
                Optional:
                - cloudinary_url: Processed image URL
                - image_credit: Image attribution
                - categories: List of tags
                
        Returns:
            Path to generated markdown file, or None if skipped
        """
        story_id = story.get("id")
        if not story_id:
            logger.warning("Story missing ID, skipping")
            return None
        
        if self.is_processed(story_id):
            logger.debug(f"Story already processed: {story_id}")
            return None
        
        title = story.get("title", "Untitled")
        
        # Generate slug and filename
        slug = slugify(title[:60])
        pub_date = story.get("pub_date") or datetime.utcnow()
        date_prefix = pub_date.strftime("%Y-%m-%d")
        filename = f"{date_prefix}-{slug}.md"
        filepath = self.content_dir / filename
        
        # Build frontmatter
        metadata = {
            "title": title,
            "date": pub_date.isoformat() if isinstance(pub_date, datetime) else pub_date,
            "draft": False,
            "source_url": story.get("link"),
            "source_name": story.get("source_name", "Unknown"),
        }
        
        # Add image if available
        if story.get("cloudinary_url"):
            metadata["image"] = story["cloudinary_url"]
        if story.get("image_credit"):
            metadata["image_credit"] = story["image_credit"]
        
        # Add tags from categories
        if story.get("categories"):
            metadata["tags"] = [c for c in story["categories"] if c]
        
        # Build content body
        description = story.get("description") or ""
        content_body = story.get("content") or description
        
        # Truncate if too long
        if len(content_body) > 2000:
            content_body = content_body[:2000] + "..."
        
        # Add source link
        source_link = f"\n\n[Read the original article]({story.get('link')})"
        
        # Create frontmatter post
        post = frontmatter.Post(content_body + source_link, **metadata)
        
        # Write to file
        try:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(frontmatter.dumps(post))
            
            # Update history
            self.history.add(story_id)
            self._save_history()
            
            logger.info(f"Published: {filename}")
            return filepath
            
        except IOError as e:
            logger.error(f"Failed to write {filename}: {e}")
            return None
    
    def publish_stories(self, stories: list[dict]) -> list[Path]:
        """
        Publish multiple stories.
        
        Args:
            stories: List of story dicts
            
        Returns:
            List of paths to generated files
        """
        published = []
        for story in stories:
            path = self.publish_story(story)
            if path:
                published.append(path)
        
        logger.info(f"Published {len(published)} new articles")
        return published
