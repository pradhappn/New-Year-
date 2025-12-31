Deployment Instructions

1) Install Vercel CLI (optional, you can also use dashboard):

```powershell
npm i -g vercel
vercel login
```

2) Run locally (recommended) to verify serverless APIs:

```powershell
vercel dev
# open http://localhost:3000
```

3) Set the `YOUTUBE_API_KEY` env var in Vercel (if you want YouTube live search):

```powershell
vercel env add YOUTUBE_API_KEY production
# follow prompts to paste your API key
```

4) Deploy to production:

```powershell
vercel --prod
```

Notes:
- The `api/` folder contains serverless functions used by the client.
- The client now requests `?enrich=1` when opening country details to attempt fetching Wikipedia summaries; enrichment is best-effort and will fall back to local data if unavailable.
