# New Year Live Countdown

Scaffolded Node + static frontend app that streams live countdowns for countries via Server-Sent Events (SSE).

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Run the server:

```bash
npm start
```

3. Open `http://localhost:3000` in a browser (desktop or mobile).

## Features

- Live per-country countdowns (uses `countries-and-timezones` if installed).
- Responsive, trendy card UI with flags and a "Search Live" button.
- Click "Search Live" to open YouTube search results for "New Year live <country>".

## YouTube API (optional)

If you want in-page search results and embedded live players, create a `.env` file at the project root with:

```
YOUTUBE_API_KEY=your_api_key_here
```

The server exposes `/api/search?q=...` which proxies the YouTube Data API (live events). If `YOUTUBE_API_KEY` is not set the client falls back to opening YouTube search results in a new tab.

## Notes & next steps

- To embed actual YouTube streams you will need the YouTube Data API and/or manual video IDs; this project provides a quick search fallback.
- To ensure full country coverage install dependencies via `npm install` (already included in `package.json`).
 
How to get a `YOUTUBE_API_KEY`:

1. Go to Google Cloud Console (https://console.cloud.google.com/).
2. Create or select a project.
3. Enable the "YouTube Data API v3" for the project.
4. Go to "APIs & Services > Credentials" and create an API key.
5. Paste the key into a `.env` file as shown above, then restart the server.

If you don't provide a key, clicking "Search Live" will show a modal with a link to YouTube search results as a fallback.
- To enable in-page playback (modal player), create a `.env` in the project root with `YOUTUBE_API_KEY=YOUR_API_KEY` and restart the server.
 - To embed actual YouTube streams you will need the YouTube Data API and/or manual video IDs; this project provides a quick search fallback.
 - To ensure full country coverage install dependencies via `npm install` (already included in `package.json`).

Files:
- [server.js](server.js)
- [public/index.html](public/index.html)
- [public/app.js](public/app.js)
- [public/styles.css](public/styles.css)

