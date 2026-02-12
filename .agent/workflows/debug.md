---
description: Comprehensive site debugging workflow for Next.js evofutura project
---

# Site Debug Workflow

// turbo-all

## 1. Environment Check
```bash
cd /home/tyler/Dev/evofutura && node -v && npm -v
```
Verify Node.js and npm are available.

## 2. Dependency Health
```bash
npm ls --depth=0 2>&1 | head -30
```
Check for unmet peer dependencies or version conflicts.

## 3. TypeScript Compilation
```bash
npx tsc --noEmit 2>&1 | head -50
```
Catch type errors before runtime.

## 4. ESLint Scan
```bash
npm run lint 2>&1 | head -50
```
Identify code quality issues.

## 5. Build Test
```bash
npm run build 2>&1 | tail -100
```
Full production build - catches SSR issues, missing exports, broken imports.

## 6. Database Check (Prisma)
```bash
npx prisma validate && npx prisma db push --dry-run 2>&1
```
Validate schema and check for pending migrations.

## 7. Start Dev Server (Interactive)
```bash
npm run dev
```
Start the dev server. Watch console output for:
- Hydration mismatches
- Runtime errors
- API route failures

## 8. Browser Smoke Test
After dev server is running:
1. Navigate to `http://localhost:3000`
2. Check browser console for JS errors
3. Check Network tab for failed requests (4xx/5xx)
4. Test critical user flows:
   - Home page loads
   - Blog/archive pages render
   - Subscribe form works
   - Admin panel accessible

## 9. Common Debug Targets
If specific issues occur, investigate these files:
- **Layout issues**: `app/layout.tsx`, `app/globals.css`
- **Home page**: `app/page.tsx`
- **API routes**: `app/api/*`
- **Database**: `prisma/schema.prisma`, `lib/prisma.ts`
- **Components**: `components/*`
- **Config issues**: `next.config.ts`, `.env`

## 10. Quick Fixes Reference
| Issue | Command |
|-------|---------|
| Clear Next cache | `rm -rf .next` |
| Reinstall deps | `rm -rf node_modules && npm i` |
| Reset Prisma | `npx prisma generate` |
| Check env vars | `cat .env` |
