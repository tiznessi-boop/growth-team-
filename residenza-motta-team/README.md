# Residenza Motta · Growth Team

AI-powered revenue management team for Residenza Motta, Locarno.

## Deploy to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial deploy"
git remote add origin https://github.com/YOUR_USERNAME/residenza-motta-team.git
git push -u origin main
```

### 2. Import to Vercel
- Go to vercel.com → New Project
- Import your GitHub repo
- Framework: **Vite**
- Root directory: leave empty

### 3. Add Environment Variable
In Vercel project settings → Environment Variables:
```
VITE_ANTHROPIC_API_KEY = sk-ant-xxxxxxxxxxxx
```
Get your key at: https://console.anthropic.com

### 4. Deploy
Click Deploy. Done.

## Local Development
```bash
npm install
cp .env.example .env.local
# Add your API key to .env.local
npm run dev
```

## Cost
Each mission uses ~3-5 API calls to claude-sonnet.
Estimated cost: CHF 0.02–0.10 per mission.
