import os
import re

POSTS_DIR = '/home/tyler/Documents/evo/content/posts'

MAPPINGS = {
    'â€~': "'",
    'â€™': "'",
    'â€"': "—",
    'â€œ': '"',
    'â€\x9d': '"',
    'â€¦': '...',
    'aeurtm': "'",
    'aeur': "'",
    'â€“': "–",
}

def fix_mojibake():
    count = 0
    for filename in os.listdir(POSTS_DIR):
        if not filename.endswith('.md'):
            continue
            
        filepath = os.path.join(POSTS_DIR, filename)
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        new_content = content
        for key, value in MAPPINGS.items():
            new_content = new_content.replace(key, value)
            
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            count += 1
            
    print(f"Fixed encoding in {count} posts.")

if __name__ == "__main__":
    fix_mojibake()
