import os
import random
import re

TAGS = ['ai-research', 'robotics', 'industry', 'policy', 'products']
POSTS_DIR = '/home/tyler/Documents/evo/content/posts'

def update_posts():
    count = 0
    updated_files = 0
    
    for filename in os.listdir(POSTS_DIR):
        if not filename.endswith('.md'):
            continue
            
        filepath = os.path.join(POSTS_DIR, filename)
        with open(filepath, 'r') as f:
            content = f.read()
            
        parts = content.split('---', 2)
        if len(parts) < 3:
            print(f"Skipping {filename}: Invalid frontmatter")
            continue
            
        frontmatter = parts[1]
        body = parts[2]
        
        lines = frontmatter.split('\n')
        new_lines = []
        existing_tags = []
        in_tags_block = False
        
        # Parse frontmatter to find tags and other keys
        for line in lines:
            if line.strip() == '':
                if not in_tags_block:
                    new_lines.append(line)
                continue
                
            # Check if line is a key
            if re.match(r'^[a-zA-Z0-9_]+:', line):
                if line.startswith('tags:'):
                    in_tags_block = True
                    # Check for inline tags: tags: [a, b]
                    if '[' in line:
                        # naive parse
                        items = re.findall(r'\[(.*?)\]', line)
                        if items:
                            raw_tags = items[0].split(',')
                            existing_tags.extend([t.strip() for t in raw_tags if t.strip()])
                else:
                    in_tags_block = False
                    new_lines.append(line)
            elif in_tags_block:
                # likely a list item
                if line.strip().startswith('-'):
                    tag_val = line.strip()[1:].strip()
                    existing_tags.append(tag_val)
                else:
                    # indented continuation or something else, likely belongs to tags if indented
                    # but if unindented and not a key? ambiguous. assume key if no indent.
                    if not line.startswith(' ') and not line.startswith('\t'):
                        in_tags_block = False
                        new_lines.append(line)
            else:
                new_lines.append(line)
        
        # Add new random tags
        new_tags = random.sample(TAGS, k=random.randint(1, 2))
        all_tags = list(set(existing_tags + new_tags))
        all_tags.sort()
        
        # Construct new tags block
        tags_block = ['tags:']
        for tag in all_tags:
            tags_block.append(f'  - {tag}')
            
        # Insert tags block before the last line if it's unrelated, or just append to end of frontmatter keys
        # We'll just append it to the end of the new_lines
        # But wait, we stripped empty lines from tags block, we should preserve structure.
        # simpler: just append tags at the end of new_lines list, before any final empty lines
        
        # Remove empty lines at end
        while new_lines and new_lines[-1].strip() == '':
            new_lines.pop()
            
        new_lines.extend(tags_block)
        new_lines.append('') # trailing newline
        
        new_frontmatter = '\n'.join(new_lines)
        if not new_frontmatter.startswith('\n'):
            new_frontmatter = '\n' + new_frontmatter
            
        new_content = '---' + new_frontmatter + '---' + body
        
        with open(filepath, 'w') as f:
            f.write(new_content)
        updated_files += 1
            
    print(f"Successfully updated {updated_files} posts with merged tags.")

if __name__ == '__main__':
    update_posts()
