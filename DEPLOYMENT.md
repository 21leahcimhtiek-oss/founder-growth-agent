# Founder Growth Agent — Deployment Instructions

## ✅ Current Status

- **GitHub Repo:** https://github.com/21leahcimhtiek-oss/founder-growth-agent
- **Live Preview:** https://00srw.app.super.myninja.ai
- **Build:** Successful (Next.js 16, Production mode)

The app is currently running locally and exposed via a public tunnel. For permanent hosting, follow the instructions below.

## Option 1: Deploy to Vercel (Recommended)

### Step 1: Import the repository
1. Go to https://vercel.com/new
2. Import repository: `21leahcimhtiek-oss/founder-growth-agent`
3. Click **Import**

### Step 2: Configure environment variable
In **Environment Variables**, add:
- **Name:** `OPENAI_API_KEY`
- **Value:** `YOUR_OPENAI_API_KEY_HERE`

### Step 3: Deploy
Click **Deploy**. Vercel will build and deploy in ~2 minutes.

### Step 4: Verify
Once deployed, Vercel will provide:
- Production URL: `https://founder-growth-agent.vercel.app`
- Custom domain option (optional)

## Option 2: Manual Vercel deploy with CLI

If you have the Vercel CLI installed and authenticated:

```bash
cd founder-growth-agent
vercel
# Follow prompts
# Add OPENAI_API_KEY when prompted
# Production deploy: vercel --prod
```

## Option 3: Docker Deployment

### Build image:
```bash
cd founder-growth-agent
docker build -t founder-growth-agent .
```

### Run container:
```bash
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE \
  founder-growth-agent
```

## Environment Variables

Required:
- `OPENAI_API_KEY` — OpenAI API key (GPT-4o access)

Optional:
- `NODE_ENV` — Defaults to `production` on build

## Troubleshooting

### Build fails with "Missing OPENAI_API_KEY"
The build should not require the API key. If it does, verify `app/api/chat/route.ts` defers client initialization to runtime (already fixed in this repo).

### Fonts not loading
If using Turbopack, fonts may fail. This repo uses standard webpack build to avoid the issue.

### API returns 500 error
- Verify `OPENAI_API_KEY` is set in deployment environment
- Check Vercel deployment logs for detailed error messages

## Project Structure

```
founder-growth-agent/
├── app/
│   ├── api/chat/route.ts    # OpenAI streaming endpoint
│   ├── layout.tsx            # Root layout with metadata
│   ├── page.tsx              # Home page
│   └── globals.css           # Tailwind imports
├── components/
│   └── FounderGrowthChat.tsx # Chat interface
├── lib/
│   └── agent.ts              # System prompt definition
├── public/                   # Static assets
├── package.json              # Dependencies
├── next.config.ts            # Next.js config
├── tsconfig.json             # TypeScript config
└── README.md                 # Documentation
```

## Tech Stack

- **Next.js 16.2.1** — React framework with App Router
- **TypeScript** — Type safety
- **Tailwind CSS v4** — Styling
- **OpenAI SDK** — GPT-4o streaming
- **React Markdown** — Content rendering