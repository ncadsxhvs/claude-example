# Riley Brown - Next.js Landing Page

A modern, minimalist landing page for Riley Brown, the #1 AI educator and content creator, built with Next.js, TypeScript, and Tailwind CSS. Features AI chat integration and community discussion system.

## Features

- **🎨 Minimalist Design**: Clean, document-style layout with elegant typography
- **🤖 AI Chat**: Protected chat interface with Riley Brown persona powered by OpenAI GPT-4
- **💬 Community Comments**: Real-time commenting system with likes functionality
- **🔐 Authentication**: Google sign-in integration via Firebase Auth
- **⚡ Real-time Updates**: Live comment updates using Firestore
- **📱 Responsive Design**: Mobile-optimized interface with Tailwind CSS
- **🚀 Next.js 15**: Server-side rendering, API routes, and modern React features
- **📝 TypeScript**: Full type safety throughout the application

## Quick Start

1. Install dependencies: `npm install`
2. Copy environment variables: `cp .env.local.example .env.local`
3. Add your OpenAI API key to `.env.local`
4. Run development server: `npm run dev`
5. Open http://localhost:3000

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Frontend**: React 18, TypeScript, Tailwind CSS  
- **Authentication**: Firebase Auth (Google provider)
- **Database**: Cloud Firestore
- **AI**: OpenAI GPT-4 API
- **Deployment**: Vercel

## Environment Variables

Required:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

## Deployment

Deploy to Vercel with one click. Set the `OPENAI_API_KEY` environment variable in your Vercel dashboard.

## License

MIT