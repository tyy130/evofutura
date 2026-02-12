---
description: UX/UI audit and improvement workflow for the evofutura site
---

# UX/UI Audit Workflow

// turbo-all

## 1. Start Dev Server
```bash
cd /home/tyler/Dev/evofutura && npm run dev
```
Wait for server to be ready on http://localhost:3000

## 2. Visual Audit - Home Page
Navigate to http://localhost:3000 and perform visual inspection:
- [ ] Hero section: hierarchy, whitespace, CTA visibility
- [ ] Typography: font sizes, line heights, contrast ratios
- [ ] Color consistency: brand colors applied correctly
- [ ] Responsive: check at 375px, 768px, 1024px, 1440px
- [ ] Animations: smooth, not janky, appropriate duration
- [ ] Images: properly sized, no layout shift

## 3. Visual Audit - Blog Post
Navigate to any blog post (/blog/[slug]):
- [ ] Article readability: line length (45-75 chars ideal)
- [ ] Code blocks: syntax highlighting, scroll behavior
- [ ] Image sizing within content
- [ ] Related posts section
- [ ] Author section styling

## 4. Visual Audit - Archive/Category
Navigate to /archive and /category/ai:
- [ ] Grid/list layout consistency
- [ ] Card hover states
- [ ] Pagination if applicable
- [ ] Empty states

## 5. Visual Audit - Forms
Navigate to /subscribe and /admin:
- [ ] Input focus states
- [ ] Button hover/active states
- [ ] Error message styling
- [ ] Success feedback
- [ ] Loading states

## 6. Accessibility Checks
Run in browser console or via tools:
```bash
# Check for color contrast issues
npx pa11y http://localhost:3000 --reporter cli 2>&1 | head -50
```

Manual checks:
- [ ] Keyboard navigation (Tab through all interactive elements)
- [ ] Focus indicators visible
- [ ] Alt text on images
- [ ] ARIA labels on buttons/links
- [ ] Skip-to-content link

## 7. Performance Visual Impact
Check using Lighthouse or browser DevTools:
- [ ] LCP element identified and optimized
- [ ] CLS - no layout shifts
- [ ] FID - interactive elements respond quickly

## 8. Common UX Issues to Check
| Issue | Where to Look |
|-------|---------------|
| Text over images unreadable | Hero, cards with overlays |
| Buttons too small (< 44px tap target) | Mobile nav, footer |
| Too much cognitive load | Home page, admin dashboard |
| Unclear CTAs | Newsletter forms, subscribe page |
| Missing loading feedback | Form submissions, AI tools |

## 9. Design System Audit
Check CSS for consistency:
```bash
grep -r "text-\[" app/ components/ --include="*.tsx" | head -20
```
Look for arbitrary Tailwind values that should be design tokens.

```bash
grep -r "bg-\[" app/ components/ --include="*.tsx" | head -20
```

## 10. Screenshot Key Screens
Use browser tools to capture:
- Home (desktop & mobile)
- Blog post
- Subscribe page
- Admin dashboard

## 11. Quick Fixes Reference
| Issue | Fix |
|-------|-----|
| Low contrast text | Increase font weight or darken color |
| Cramped spacing | Add `space-y-*` or increase padding |
| Inconsistent borders | Standardize to `border-slate-100/200` |
| Missing focus ring | Add `focus:ring-2 focus:ring-blue-600` |
| Slow animations | Change `duration-700` → `duration-300` |

## 12. Report Findings
After audit, document:
1. Critical issues (blocking UX)
2. Major issues (significant friction)
3. Minor issues (polish items)
4. Suggestions (nice-to-have improvements)
