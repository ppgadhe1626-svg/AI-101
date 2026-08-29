# AI 101 — Prompt to App

Generates complete, working web applications from natural language prompts using an LLM.
Built as part of the AI 101 project (Electrical Engineering Association, IIT Kanpur).

## How it works

1. You describe an app in plain English in the browser UI.
2. The frontend sends that prompt to a small Express backend (`server.js`).
3. The backend calls the Anthropic API with a system prompt instructing the model to
   return one complete, self-contained HTML file (inline CSS + JS).
4. The generated file is rendered live in an `<iframe>` on the page, with a raw-code
   tab and a download button.

```
Browser (public/) --POST /api/generate--> Express server --> Anthropic API
```

The API key lives only on the server. The frontend never talks to `api.anthropic.com`
directly — that would expose the key in browser JS and also gets blocked by CORS.

## Project structure

```
ai101-app-generator/
├── public/
│   ├── index.html      # page structure
│   ├── style.css        # all styling
│   └── script.js        # UI logic + calls to /api/generate
├── server.js            # Express server, proxies to Anthropic API
├── package.json
├── .env.example
└── .gitignore
```

## Setup

```bash
npm install
cp .env.example .env
# edit .env and paste your key from https://console.anthropic.com/
npm start
```

Then open http://localhost:3000

## Swapping in a fine-tuned model

`server.js` currently calls `claude-sonnet-4-6`. To use your own fine-tuned model
(the original AI 101 project used a fine-tuned LLM), just change the `model` field
in the request body in `server.js`, or point the fetch call at your own inference
endpoint instead of `https://api.anthropic.com/v1/messages`.

## Deploying

Any Node host works (Render, Railway, Fly.io, a VM, etc.). Set the `ANTHROPIC_API_KEY`
environment variable in your host's dashboard rather than committing `.env`.

## Notes / possible extensions

- Generated apps are single HTML files, so they run cleanly in the iframe sandbox
  with no relative asset paths to worry about.
- History is in-memory only (resets on page reload). Could be persisted with a
  database or `localStorage` if you want it to survive refreshes.
- Could be extended with a "refine this app" follow-up prompt for multi-turn edits
  instead of regenerating from scratch each time.
