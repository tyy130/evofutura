# Evofutura

Autonomous Technology Publication.

## Development

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run ingestion locally
python -m ingestion.main

# Start Hugo dev server
hugo server -D
```

## Environment Variables

Set these in `.env` or as GitHub Secrets:

- `NEWSDATA_API_KEY` — NewsData.io API key
- `NEWSAPI_AI_KEY` — NewsAPI.ai (EventRegistry) API key
- `OPENAI_API_KEY` — OpenAI API key
- `CLOUDINARY_URL` — Cloudinary connection string

## Architecture

See `.gemini/antigravity/brain/*/implementation_plan.md` for full spec.
