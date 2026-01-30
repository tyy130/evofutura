"""
Unit tests for Kill List filter.

Tests verify deterministic rejection of:
- Crypto/Finance stories
- Minor update announcements
- Rumors and speculation
- Political content (except tech bans)
- Commerce/deal content
"""

import pytest
from ingestion.filters import is_rejected, filter_stories


class TestCryptoFilter:
    """Test crypto/finance rejection."""
    
    def test_bitcoin_rejected(self):
        rejected, reason = is_rejected("Bitcoin hits new all-time high")
        assert rejected is True
        assert reason == "crypto_finance"
    
    def test_ethereum_rejected(self):
        rejected, reason = is_rejected("Ethereum 2.0 staking rewards explained")
        assert rejected is True
        assert reason == "crypto_finance"
    
    def test_nft_rejected(self):
        rejected, reason = is_rejected("NFT marketplace sees record sales")
        assert rejected is True
        assert reason == "crypto_finance"
    
    def test_market_cap_rejected(self):
        rejected, reason = is_rejected("Crypto market cap reaches $2 trillion")
        assert rejected is True
        assert reason == "crypto_finance"


class TestMinorUpdateFilter:
    """Test patch/maintenance update rejection."""
    
    def test_patch_version_rejected(self):
        rejected, reason = is_rejected("iOS 17.4.1 fixes security bug")
        assert rejected is True
        assert reason == "minor_update"
    
    def test_major_version_accepted(self):
        rejected, reason = is_rejected("iOS 18.0 introduces AI features")
        assert rejected is False
        assert reason == ""
    
    def test_hotfix_rejected(self):
        rejected, reason = is_rejected("Chrome hotfix addresses crash bug")
        assert rejected is True
        assert reason == "minor_update"


class TestRumorFilter:
    """Test rumor/speculation rejection."""
    
    def test_leaked_rejected(self):
        rejected, reason = is_rejected("Leaked Apple specs reveal new chip")
        assert rejected is True
        assert reason == "rumor"
    
    def test_reportedly_rejected(self):
        rejected, reason = is_rejected("Apple reportedly working on foldable iPhone")
        assert rejected is True
        assert reason == "rumor"
    
    def test_analyst_says_rejected(self):
        rejected, reason = is_rejected("Analyst says iPhone sales will drop")
        assert rejected is True
        assert reason == "rumor"
    
    def test_confirmed_news_accepted(self):
        rejected, reason = is_rejected("Apple announces iPhone 16 at WWDC")
        assert rejected is False
        assert reason == ""


class TestPoliticsFilter:
    """Test political content rejection with tech ban exception."""
    
    def test_lawsuit_rejected(self):
        rejected, reason = is_rejected("Apple faces antitrust lawsuit in EU")
        assert rejected is True
        assert reason == "politics"
    
    def test_lobbying_rejected(self):
        rejected, reason = is_rejected("Tech giants increase lobbying spending")
        assert rejected is True
        assert reason == "politics"
    
    def test_tech_ban_accepted(self):
        """Tech bans are the exception to politics filter."""
        rejected, reason = is_rejected("TikTok app banned in Montana")
        assert rejected is False
        assert reason == ""
    
    def test_device_restriction_accepted(self):
        rejected, reason = is_rejected("Huawei devices blocked from US networks")
        assert rejected is False
        assert reason == ""


class TestCommerceFilter:
    """Test deal/shopping content rejection."""
    
    def test_black_friday_rejected(self):
        rejected, reason = is_rejected("Best Black Friday deals on laptops")
        assert rejected is True
        assert reason == "commerce"
    
    def test_discount_rejected(self):
        rejected, reason = is_rejected("Save 50% on MacBook Pro today")
        assert rejected is True
        assert reason == "commerce"
    
    def test_buying_guide_rejected(self):
        rejected, reason = is_rejected("Ultimate buying guide for gaming PCs")
        assert rejected is True
        assert reason == "commerce"
    
    def test_product_announcement_accepted(self):
        rejected, reason = is_rejected("Boston Dynamics unveils new Spot features")
        assert rejected is False
        assert reason == ""


class TestFilterStories:
    """Test batch filtering function."""
    
    def test_filters_mixed_stories(self):
        stories = [
            {"title": "Bitcoin crashes 20%", "description": "Crypto market turmoil"},
            {"title": "OpenAI releases GPT-5", "description": "New AI breakthrough"},
            {"title": "Best deals on phones", "description": "Shopping guide"},
            {"title": "Boston Dynamics Spot update", "description": "New features"},
        ]
        
        result = filter_stories(stories)
        
        assert len(result) == 2
        assert result[0]["title"] == "OpenAI releases GPT-5"
        assert result[1]["title"] == "Boston Dynamics Spot update"
    
    def test_empty_list_returns_empty(self):
        assert filter_stories([]) == []
    
    def test_all_rejected_returns_empty(self):
        stories = [
            {"title": "Bitcoin hits $100k"},
            {"title": "Leaked iPhone specs"},
        ]
        assert filter_stories(stories) == []
