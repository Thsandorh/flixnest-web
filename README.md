# Flixnest

A sleek streaming aggregator that brings together content from multiple sources. Think of it as your personal streaming hub - connect your favorite Stremio addons, browse movies and shows, and play them in your preferred external player.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwindcss)

## What's this?

Flixnest doesn't host any content. It's a frontend that aggregates streams from Stremio-compatible addons and lets you open them in external players like VLC, Infuse, or MX Player. The UI is built for both desktop and mobile, with a focus on keeping things fast and out of your way.

## Features

- **Addon System** - Add any Stremio-compatible addon (Torrentio, etc.)
- **External Players** - VLC, Infuse, Outplayer, Just Player, MX Player
- **M3U Export** - Download streams as M3U files with proper titles for VLC
- **Subtitle Support** - Fetch subtitles from addon providers, auto-select by language preference
- **Watchlist & History** - Track what you want to watch and where you left off
- **Categories** - Browse by genre with infinite scroll
- **PWA Ready** - Install as an app on mobile devices

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Data Fetching**: TanStack Query
- **Animations**: Framer Motion
- **Video**: Vidstack, HLS.js, Shaka Player

## Getting Started

```bash
# Clone it
git clone https://github.com/your-username/flixnest-web.git
cd flixnest-web

# Install deps
npm install

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and you're good to go.

## Project Structure

```
├── app/                  # Next.js app router pages
│   ├── watch/           # Watch page (stream selection, players)
│   ├── discover/        # Category/genre browsing
│   ├── movies/          # Movie listings
│   ├── series/          # TV show listings
│   └── addons/          # Addon management
├── components/          # React components
│   ├── ui/              # Reusable UI components
│   └── player/          # Video player components
├── lib/                 # Utility functions, API helpers
├── store/               # Zustand stores
└── public/              # Static assets, PWA manifest
```

## Configuration

Content metadata comes from TMDB. The API key is included for convenience, but you can swap it out in the relevant files if needed.

Addons are managed through the UI - just paste a Stremio addon manifest URL and you're set.

## Building for Production

```bash
npm run build
npm start
```

Or deploy to Vercel, Netlify, etc. - standard Next.js deployment.

## Notes

- This is a frontend-only project. No content is hosted or served.
- Streams come from whatever addons you configure.
- Some addons require debrid services to be configured within the addon itself.
- For best results on mobile, install the PWA and use it with VLC or Infuse.

## License

MIT
