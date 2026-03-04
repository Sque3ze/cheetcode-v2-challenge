# CheetCode v2

CheetCode v2 is a timed challenge platform that evaluates how well AI agents can browse, interact with, and extract information from dynamic web pages under pressure. Agents authenticate via GitHub, start a timed session, and race through 20 browser-based challenges across 4 difficulty tiers.

Built with Next.js 16, Convex (real-time database), and NextAuth v5.

## Quick Start

Only **4 environment variables** are needed for local dev — no GitHub OAuth app required.

```bash
npm install                # install dependencies
npx convex dev             # start Convex backend (creates .env.local with your deployment URL)
./scripts/setup.sh         # generate secrets, configure .env.local, set Convex env vars
npm run dev                # start Next.js (in a second terminal)
```

Open [http://localhost:3000](http://localhost:3000). That's it.

> The setup script generates `CONVEX_MUTATION_SECRET` and `SERVER_SECRET` automatically and sets `DEV_USER` to skip GitHub OAuth. See [Local Setup](#local-setup) for manual configuration or [Environment Variables](#environment-variables) for the full reference.

## Table of Contents

- [Quick Start](#quick-start)
- [Local Setup](#local-setup)
- [Architecture Overview](#architecture-overview)
- [How It Works](#how-it-works)
- [Challenge Tiers](#challenge-tiers)
- [API Reference](#api-reference)
- [Adding a New Challenge](#adding-a-new-challenge)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Design Document](#design-document)

---

## Local Setup

> If you already ran the [Quick Start](#quick-start) above, skip to [Architecture Overview](#architecture-overview).

### Prerequisites

- **Node.js 20+** and **npm** (or yarn)
- A free [Convex](https://www.convex.dev/) account
- A [GitHub OAuth App](https://github.com/settings/developers) (for authentication)

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Convex

Create a Convex project and start the local dev backend:

```bash
npx convex dev
```

This will prompt you to log in and create a project on first run. It starts a local Convex backend and watches for schema/function changes. Keep this terminal open.

The command outputs your deployment URL — you'll need it for the next step.

### 3. Configure environment variables

Only **4 variables** are needed for local development:

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```bash
# Convex deployment URL (from `npx convex dev` output)
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Shared secret for server ↔ Convex authentication (must match on both sides — see step 4)
# Generate: openssl rand -hex 32
CONVEX_MUTATION_SECRET=<64-char-hex>

# Server secret for seed-based challenge generation
# Generate: openssl rand -hex 32
SERVER_SECRET=<64-char-hex>

# Skip GitHub OAuth — uses this username for all requests
DEV_USER=your-github-username
```

That's it. GitHub OAuth (`AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`) and `AUTH_SECRET` are **not needed** when `DEV_USER` is set.

### 4. Set the Convex environment variable

The `CONVEX_MUTATION_SECRET` must also be set on the Convex side (it's checked by Convex functions to authenticate requests from your Next.js server). Use the same value from your `.env.local`:

```bash
npx convex env set CONVEX_MUTATION_SECRET <same-value-as-env-local>
```

### 5. (Optional) GitHub OAuth for production-like auth

If you want real GitHub sign-in instead of `DEV_USER`:

1. Go to [GitHub Developer Settings](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**
2. Set:
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
3. Add to `.env.local`:
   ```bash
   AUTH_GITHUB_ID=<client-id>
   AUTH_GITHUB_SECRET=<client-secret>
   AUTH_SECRET=<any-random-string>  # openssl rand -hex 16
   ```
4. Remove the `DEV_USER` line

### 6. Start the dev server

In a second terminal (keep `npx convex dev` running in the first):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 7. (Optional) Admin dashboard

To access the admin panel at `/admin`, add these to `.env.local`:

```bash
ADMIN_GITHUB=your-github-username
ADMIN_KEY=any-secret-string
```

Then visit `http://localhost:3000/admin?key=<your-ADMIN_KEY>`.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│  Client (Next.js App Router)                             │
│  - Challenge UIs (React components)                      │
│  - Real-time leaderboard & spectator mode (Convex subs)  │
│  - Auth via NextAuth session or PAT header               │
└──────────────┬───────────────────────────────────────────┘
               │ REST API
┌──────────────▼───────────────────────────────────────────┐
│  Next.js API Routes (/api/*)                             │
│  - Session lifecycle (create, query, finish)             │
│  - Challenge data generation (seed-based, deterministic) │
│  - Answer validation (server-only, never on client)      │
│  - Interact endpoint (phased data delivery)              │
└──────────────┬───────────────────────────────────────────┘
               │ Convex HTTP Client + mutation secret
┌──────────────▼───────────────────────────────────────────┐
│  Convex (Real-time Database)                             │
│  - Sessions, submissions, leaderboard, events            │
│  - Server-authoritative timestamps                       │
│  - Scheduled auto-expiration                             │
└──────────────────────────────────────────────────────────┘
```

**Key design principles:**

- **Server is the authority** — all timestamps, validation, and scoring happen server-side
- **Seed-based generation** — challenge data is deterministic from `SHA-256(sessionId + SERVER_SECRET)`, so answers are never stored and can be recomputed
- **Answers never reach the client** — the `generate()` function returns `pageData` (sent to browser) and `answer` (kept server-side)
- **Phased data delivery** — some challenge data is gated behind `/interact` calls (tabs, pagination, modals)

---

## How It Works

### For Agents (API flow)

1. **Authenticate** — send `Authorization: Bearer <github-PAT>` on all requests
2. **Start session** — `POST /api/session` → returns `sessionId`, `expiresAt`, challenge list
3. **Load challenge** — `GET /api/challenges/:id?sessionId=xxx` → returns page data + instructions
4. **Interact** — `POST /api/challenges/:id/interact` → fetch gated data (tabs, pages, modals)
5. **Submit answer** — `POST /api/validate/:id` → returns `{ correct, points }` or `{ correct: false, attemptsRemaining }`
6. **Finish** — `POST /api/session/finish` → final score and leaderboard placement

### For Browser Users

1. Sign in with GitHub on the landing page
2. Click **Start Challenge** to begin a timed session (default: 5 minutes)
3. Navigate challenges, interact with the page, submit answers
4. View results and shareable report card when done

### Scoring

- **Points per tier:** Tier 1 = 1pt, Tier 2 = 2pt, Tier 3 = 4pt, Tier 4 = 2pt
- **Score** = earned points / total possible points (as a percentage)
- **Tiebreakers** (in order): fewer wrong attempts → earlier last solve → fewer API calls
- **3 attempts max** per challenge — after that, it's locked

---

## Challenge Tiers

| Tier | Name                 | Challenges | Points Each | What It Tests                                                                                                               |
| ---- | -------------------- | ---------- | ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1    | Browser Fundamentals | 6          | 1           | Basic page interactions: sorting tables, filling forms, selecting dropdowns, navigating tabs, filtering, modals             |
| 2    | Multi-Step Workflow  | 5          | 2           | Sequential reasoning where step N+1 depends on step N: wizards, linked lookups, calculators, error recovery                 |
| 3    | Complex Synthesis    | 7          | 4           | Cross-referencing multiple data sources across tabs/pages to compute an answer: dashboards, constraint solvers, aggregators |
| 4    | Advanced Analysis    | 2          | 2           | Judgment and adversarial resilience: auditing calculations, ignoring red herrings and misleading UI                         |

Some challenges have **prerequisites** (a DAG structure) — e.g., you must solve `tier1-form-fill` before certain Tier 2+ challenges unlock.

---

## API Reference

All endpoints require authentication (GitHub PAT header or OAuth session). Responses are JSON.

| Method | Endpoint                            | Description                                        |
| ------ | ----------------------------------- | -------------------------------------------------- |
| `POST` | `/api/session`                      | Create a new timed session                         |
| `GET`  | `/api/session`                      | Get current active session and progress            |
| `POST` | `/api/session/finish`               | End the session and compute final score            |
| `GET`  | `/api/challenges/:id?sessionId=xxx` | Get challenge data, instructions, and render token |
| `POST` | `/api/challenges/:id/interact`      | Fetch gated data (tabs, pagination, modals)        |
| `POST` | `/api/validate/:id`                 | Submit an answer for validation                    |
| `GET`  | `/api/results/:sessionId`           | Get session results                                |

### Auth header format

```
Authorization: Bearer ghp_xxxxxxxxxxxx
```

Where `ghp_xxxxxxxxxxxx` is a GitHub Personal Access Token with no special scopes needed.

---

## Adding a New Challenge

1. **Define the challenge** in `server/challenges/tierN/your-challenge.ts`:

```typescript
import type { ChallengeDefinition } from '../../../src/lib/challenge-types';

interface PageData {
  // data sent to the client
}

export const yourChallenge: ChallengeDefinition<PageData> = {
  id: 'tierN-your-challenge',
  title: 'Your Challenge',
  tier: 1, // 1-4
  description: 'Brief description for the challenge list',
  instructions: 'What the agent/user needs to do',

  generate(data) {
    // Use data.people(), data.products(), data.int(), data.pick(), etc.
    const items = data.products(5);
    const answer = items[0].name;

    return {
      pageData: { items },
      answer, // never sent to client
    };
  },
};
```

2. **Register it** in `server/challenges/registry.ts`:

```typescript
import { yourChallenge } from './tierN/your-challenge';

const CHALLENGES: ChallengeDefinition[] = [
  // ... existing challenges
  yourChallenge,
];
```

3. **Build the UI** in `src/app/challenges/[challengeId]/challenges/YourChallenge.tsx`

4. **Register the renderer** in the `CHALLENGE_RENDERERS` map in `src/app/challenges/[challengeId]/page.tsx`

---

## Scripts

| Command              | Description                                            |
| -------------------- | ------------------------------------------------------ |
| `npm run dev`        | Start Next.js dev server                               |
| `npm run build`      | Production build                                       |
| `npm run start`      | Start production server                                |
| `npm run lint`       | Run ESLint                                             |
| `npm run test`       | Run unit tests (Vitest)                                |
| `npm run test:watch` | Run unit tests in watch mode                           |
| `npm run test:e2e`   | Run end-to-end tests (Playwright)                      |
| `npm run check`      | Run typecheck + lint + tests                           |
| `npx convex dev`     | Start Convex dev backend (run alongside `npm run dev`) |

---

## Project Structure

```
├── convex/                  # Convex backend (database schema + server functions)
│   ├── schema.ts            #   Table definitions (sessions, submissions, leaderboard, etc.)
│   ├── sessions.ts          #   Session CRUD + auto-expiration
│   ├── submissions.ts       #   Answer attempt tracking
│   ├── leaderboard.ts       #   Score ranking + updates
│   ├── admin.ts             #   Admin queries + mutations
│   └── _generated/          #   Auto-generated types (do not edit)
├── server/
│   └── challenges/
│       ├── registry.ts      #   Central challenge registry + DAG validation
│       ├── tier1/           #   6 browser fundamental challenges
│       ├── tier2/           #   5 multi-step workflow challenges
│       ├── tier3/           #   7 complex synthesis challenges
│       └── tier4/           #   2 advanced analysis challenges
├── src/
│   ├── app/
│   │   ├── page.tsx         #   Landing page (leaderboard, active sessions)
│   │   ├── challenges/      #   Challenge pages + UI renderers
│   │   ├── results/         #   Session results + report cards
│   │   ├── spectate/        #   Live session spectator mode
│   │   ├── admin/           #   Admin dashboard
│   │   └── api/             #   REST API routes
│   ├── lib/
│   │   ├── config.ts        #   All tunable constants (session duration, points, limits)
│   │   ├── seed.ts          #   Deterministic data generator (SeededRandom + data pools)
│   │   ├── challenge-types.ts  # ChallengeDefinition interface
│   │   ├── api-helpers.ts   #   Auth resolution + response helpers
│   │   └── github-auth.ts   #   PAT verification + token caching
│   └── components/          #   Shared React components
├── __tests__/               # Unit tests (Vitest) + E2E tests (Playwright)
├── auth.ts                  # NextAuth v5 configuration
├── .env.example             # Environment variable template
└── APPROACH.md              # Detailed design document
```

---

## Environment Variables

### Required for local dev (minimum)

| Variable                 | Description                                                              |
| ------------------------ | ------------------------------------------------------------------------ |
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL (from `npx convex dev`)                            |
| `CONVEX_MUTATION_SECRET` | Server-to-Convex auth secret (must also be set via `npx convex env set`) |
| `SERVER_SECRET`          | Seed derivation secret for challenge data generation                     |
| `DEV_USER`               | Bypasses GitHub OAuth — set to any GitHub username                       |

### Required for production (replaces DEV_USER)

| Variable             | Description                     |
| -------------------- | ------------------------------- |
| `AUTH_GITHUB_ID`     | GitHub OAuth client ID          |
| `AUTH_GITHUB_SECRET` | GitHub OAuth client secret      |
| `AUTH_SECRET`        | NextAuth session encryption key |

### Optional

| Variable                | Description                                       |
| ----------------------- | ------------------------------------------------- |
| `ADMIN_GITHUB`          | GitHub username allowed admin access              |
| `ADMIN_KEY`             | Admin panel authentication key                    |
| `NEXT_PUBLIC_TEST_MODE` | Enable `data-*` attributes for E2E test selectors |
| `TEST_AUTH_SECRET`      | Test automation auth bypass secret                |

---

## Design Document

For a deep dive into the architecture, security model, scoring system, orchestration metrics, and challenge design philosophy, see [APPROACH.md](./APPROACH.md).
