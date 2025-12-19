# HHF

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/challe-ws-projects/v0-hhf)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/boGcJCfXMAI)

## Overview

This repository will stay in sync with your deployed chats on [v0.dev](https://v0.dev).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.dev](https://v0.dev).

## Deployment

Your project is live at:

**[https://vercel.com/challe-ws-projects/v0-hhf](https://vercel.com/challe-ws-projects/v0-hhf)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/boGcJCfXMAI](https://v0.dev/chat/projects/boGcJCfXMAI)**

## Staging / test domain

- Live stays on `harnosandshf.se` and staging runs on `hhf.wby.se` (same Vercel project).
- The helper in `lib/site-variant.ts` inspects the request host (or `NEXT_PUBLIC_SITE_VARIANT`) to decide whether a request is `production` or `staging`.
- A pink ribbon tribute theme and staging badge are applied only when the variant resolves to staging; the production host remains untouched.
- Previewing staging locally: set `NEXT_PUBLIC_SITE_VARIANT=staging` before `npm run dev` to see the hhf.wby.se look without touching prod.
- Ship experiments behind `deriveSiteVariant` / `isStagingVariant` guards so they live only on staging; remove the guard or flip the flag when explicitly promoting to live.

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository
