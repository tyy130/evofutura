"""
Cloudinary image upload with attribution.

Downloads images from source URLs and streams to Cloudinary.
No local disk writes. Returns secure URLs with credit metadata.
"""

import os
import io
import logging
from typing import Optional
from datetime import datetime

import requests
import cloudinary
import cloudinary.uploader
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)


def configure_cloudinary(cloudinary_url: Optional[str] = None) -> None:
    """
    Configure Cloudinary from URL or environment.
    
    Args:
        cloudinary_url: Cloudinary URL. Falls back to CLOUDINARY_URL env var.
    """
    url = cloudinary_url or os.environ.get("CLOUDINARY_URL")
    if not url:
        raise ValueError(
            "Cloudinary URL required. "
            "Set CLOUDINARY_URL environment variable."
        )
    # cloudinary.config() auto-parses CLOUDINARY_URL from env
    # but we set it explicitly to ensure it's configured
    os.environ["CLOUDINARY_URL"] = url


class ImageHandler:
    """Handles image download and Cloudinary upload."""
    
    def __init__(self):
        """Initialize handler. Cloudinary must be configured first."""
        configure_cloudinary()
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    def _download_image(self, url: str) -> bytes:
        """Download image to memory."""
        response = requests.get(url, timeout=30, stream=True)
        response.raise_for_status()
        return response.content
    
    def upload_image(
        self,
        image_url: str,
        slug: str,
        source_name: str
    ) -> Optional[dict]:
        """
        Download and upload image to Cloudinary.
        
        Args:
            image_url: Source image URL
            slug: Article slug for filename
            source_name: Source name for credit
            
        Returns:
            Dict with 'url' and 'credit' keys, or None on failure
        """
        if not image_url:
            return None
        
        try:
            # Download to memory
            image_data = self._download_image(image_url)
            
            # Generate folder path: evofutura/uploads/YYYY/MM/
            now = datetime.utcnow()
            folder = f"evofutura/uploads/{now.year}/{now.month:02d}"
            
            # Stream to Cloudinary
            result = cloudinary.uploader.upload(
                io.BytesIO(image_data),
                folder=folder,
                public_id=slug,
                overwrite=True,
                resource_type="image",
            )
            
            secure_url = result.get("secure_url")
            if not secure_url:
                logger.error(f"Cloudinary upload failed: no secure_url in response")
                return None
            
            logger.info(f"Uploaded image to Cloudinary: {secure_url}")
            
            return {
                "url": secure_url,
                "credit": f"Source: {source_name}",
            }
            
        except requests.RequestException as e:
            logger.error(f"Failed to download image {image_url}: {e}")
            return None
        except Exception as e:
            logger.error(f"Cloudinary upload error: {e}")
            return None
    
    def process_story_image(self, story: dict) -> dict:
        """
        Process image for a story dict, adding Cloudinary URL and credit.
        
        Args:
            story: Story dict with 'image_url', 'title', 'source_name'
            
        Returns:
            Story dict with 'cloudinary_url' and 'image_credit' added
        """
        from slugify import slugify
        
        story = story.copy()
        
        if story.get("image_url"):
            slug = slugify(story.get("title", "image")[:50])
            result = self.upload_image(
                story["image_url"],
                slug,
                story.get("source_name", "Unknown")
            )
            if result:
                story["cloudinary_url"] = result["url"]
                story["image_credit"] = result["credit"]
        
        return story
