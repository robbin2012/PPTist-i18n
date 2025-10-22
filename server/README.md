# PPTist AI Demo Server

Minimal Express backend that matches PPTist frontend contracts for AI features:
- POST `/tools/aippt_outline` – stream Markdown outline
- POST `/tools/aippt` – stream AIPPT slides as JSON chunks (one JSON per chunk)
- POST `/tools/ai_writing` – stream rewritten text

This server fakes AI output for local development. Replace the generator functions with real LLM calls for production.

## Run

```
cd server
npm install
npm start
```
Server listens on `http://127.0.0.1:5000` by default.

## Wire the frontend to this server

Option A: change Vite proxy (recommended for dev):
- Edit `vite.config.ts` and set
  - `proxy['/api'].target = 'http://127.0.0.1:5000'`
- Keep `SERVER_URL` as `/api` in the frontend so requests go through the proxy.

Option B: hardcode the API base (quick test):
- Edit `src/services/index.ts`
  - Uncomment and set `SERVER_URL = 'http://127.0.0.1:5000'`

## Streaming notes
- Each JSON object for `/tools/aippt` is written as a separate chunk; do not concatenate multiple JSONs in one chunk.
- Add `X-Accel-Buffering: no` and disable proxy buffering if you put this behind Nginx.
- Do not set `Content-Length` so Node uses `Transfer-Encoding: chunked`.

## Replace with real AI
- `generateOutlineMarkdown`, `parseOutline`, and content builders are in `server/index.js`.
- Call your LLM/provider there and forward incremental outputs via `res.write(...)`.

