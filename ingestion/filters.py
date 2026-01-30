"""
Kill List Filter Module.

Implements deterministic content filtering to reject stories matching
prohibited categories per Evofutura editorial policy.

Categories:
- Crypto/Finance: Bitcoin, tokens, NFTs, trading, market cap
- Minor Updates: Patch releases, maintenance updates
- Rumors: Leaks, speculation, unverified reports
- Politics: Lawsuits, antitrust (exception: tech bans)
- Commerce: Deals, discounts, buying guides
"""

import re
from typing import Optional


# Compiled regex patterns for performance
CRYPTO_PATTERNS = re.compile(
    r'\b(bitcoin|btc|ethereum|eth|crypto|nft|token|blockchain|'
    r'defi|web3|altcoin|stablecoin|market\s*cap|trading|'
    r'binance|coinbase|ledger|wallet)\b',
    re.IGNORECASE
)

MINOR_UPDATE_PATTERNS = re.compile(
    r'\b(hotfix|patch\s*release|maintenance\s*update|bug\s*fix\s*release)\b|'
    r'\b\d+\.\d+\.[1-9]\d*\b',  # x.y.z where z > 0 (patch versions)
    re.IGNORECASE
)

RUMOR_PATTERNS = re.compile(
    r'\b(leaked?|rumou?r|reportedly|allegedly|speculation|'
    r'analyst\s*says?|sources?\s*say|unconfirmed|'
    r'may\s+be\s+planning|could\s+announce|expected\s+to)\b',
    re.IGNORECASE
)

POLITICS_PATTERNS = re.compile(
    r'\b(lawsuit|antitrust|lobbying|lobbyist|subpoena|'
    r'congressional\s*hearing|senate\s*hearing|ftc\s*probe|'
    r'doj\s*investigation|regulatory\s*fine)\b',
    re.IGNORECASE
)

# Exception: tech bans are allowed
TECH_BAN_PATTERNS = re.compile(
    r'\b(banned?|prohibited?|restriction|block(?:ed|ing)?)\b.*'
    r'\b(app|technology|platform|software|device)\b',
    re.IGNORECASE
)

COMMERCE_PATTERNS = re.compile(
    r'\b(deal|discount|sale|promo(?:tion)?|coupon|'
    r'black\s*friday|cyber\s*monday|prime\s*day|'
    r'buying\s*guide|best\s*buy|shop(?:ping)?|'
    r'price\s*drop|save\s*\$?\d+|off\s*\d+%)\b',
    re.IGNORECASE
)


def is_rejected(title: str, description: Optional[str] = None) -> tuple[bool, str]:
    """
    Check if a story should be rejected based on the Kill List.
    
    Args:
        title: Story headline
        description: Optional story description/summary
        
    Returns:
        Tuple of (is_rejected: bool, reason: str)
        If not rejected, reason is empty string.
    """
    text = f"{title} {description or ''}"
    
    # Check crypto/finance
    if CRYPTO_PATTERNS.search(text):
        return True, "crypto_finance"
    
    # Check minor updates
    if MINOR_UPDATE_PATTERNS.search(text):
        return True, "minor_update"
    
    # Check rumors
    if RUMOR_PATTERNS.search(text):
        return True, "rumor"
    
    # Check politics (with tech ban exception)
    if POLITICS_PATTERNS.search(text):
        if not TECH_BAN_PATTERNS.search(text):
            return True, "politics"
    
    # Check commerce
    if COMMERCE_PATTERNS.search(text):
        return True, "commerce"
    
    return False, ""


def filter_stories(stories: list[dict]) -> list[dict]:
    """
    Filter a list of stories, removing those matching the Kill List.
    
    Args:
        stories: List of story dicts with 'title' and optional 'description'
        
    Returns:
        Filtered list containing only accepted stories
    """
    accepted = []
    for story in stories:
        rejected, reason = is_rejected(
            story.get("title", ""),
            story.get("description")
        )
        if not rejected:
            accepted.append(story)
    return accepted
