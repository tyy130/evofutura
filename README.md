This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Autonomous Weekly Newsletter

This project includes a built-in weekly digest system (no Mailchimp dependency).

### What it does

- Captures article popularity via `/api/analytics/view`
- Ranks weekly top reads
- Sends `EvoFutura Weekly Tech Intelligence` every Monday via Vercel Cron
- Injects an exclusive operator note every 4th week
- Tracks issue + per-subscriber delivery status in Prisma
- Supports one-click unsubscribe links

### Required environment variables

```bash
# Database (Neon / Postgres)
DATABASE_URL=postgresql://...

# Cron authorization (Vercel will send this as Bearer token)
CRON_SECRET=change-me

# SMTP delivery
NEWSLETTER_SMTP_HOST=smtp.your-provider.com
NEWSLETTER_SMTP_PORT=587
NEWSLETTER_SMTP_USER=mailer@evofutura.com
NEWSLETTER_SMTP_PASS=super-secret
NEWSLETTER_SMTP_SECURE=false
NEWSLETTER_FROM=\"EvoFutura <newsletter@evofutura.com>\"
NEWSLETTER_REPLY_TO=newsletter@evofutura.com

# Link generation
NEWSLETTER_SITE_URL=https://evofutura.com
NEWSLETTER_TOKEN_SECRET=long-random-string

# Invisible captcha (Cloudflare Turnstile)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAA...
TURNSTILE_SECRET_KEY=0x4AAAA...
```

### Manual trigger

- Cron route: `GET /api/cron/weekly-intelligence`
- Force run: `GET /api/cron/weekly-intelligence?force=1`
- Admin trigger: `POST /api/admin/newsletter` with `Authorization: Bearer evo-admin-2026`

## Editorial Cadence Control Panel

Article generation cadence is configured in:

- `config/editorial-cadence.json` (active config)
- `config/editorial-cadence.defaults.json` (baseline defaults)

Use the CLI tools:

```bash
npm run cadence:show
npm run cadence:edit
```

`cadence:edit` lets you tune:

- Article type frequency mix
- Category rotation mix
- Per-type image inclusion rates
- Type-specific writing constraints (length/structure)

Generation also includes a hard duplicate guard:

- Rejects candidate topics if they are too similar to historical titles
- Re-rolls to alternate topics automatically
- Blocks publish if a near-duplicate still scores above threshold
