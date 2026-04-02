# NexDay Web MVP

NexDay is now a Web-first MVP built with Next.js.

- Quiet Luxury three-column workspace (Action Panel / Calendar / AI Companion)
- Weekly planning starts at local Monday 00:00
- Drag-and-drop calendar editing in browser
- Goal-to-plan mock interaction (chat input -> loading -> calendar fills with task blocks)
- Local-first persistence in browser storage

## Tech Stack

- Next.js App Router + React + TypeScript
- Tailwind CSS + shadcn-style component primitives
- Framer Motion for key transitions
- react-big-calendar for week/day planning board
- Lucide React for iconography
- `@nexday/core` for reusable scheduling logic

## Project Structure

- `apps/web`: Web UI and interaction flow
- `packages/core`: shared scheduling types and planner engine
- `packages/importers`: future import pipeline (ICS/CSV parser package)
- `packages/storage`: legacy storage adapter package (kept for future migration utility)

## Prerequisites

- Node.js 18+ (recommended 20+)

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Optional: Enable LLM Planner API

Copy `apps/web/.env.example` to `apps/web/.env.local` and fill values:

```bash
LLM_API_KEY=<your_key>
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=deepseek/deepseek-chat
```

If no key is configured, NexDay will automatically fall back to the local heuristic planner.

## Current MVP Workflow

1. Set time precision and break preference in the left panel.
2. Enter a weekly goal in AI Companion on the right.
3. Click `Send Goal` or `Liquid Plan`.
4. Watch loading feedback, then task blocks appear in the calendar.
5. Drag/resize flexible blocks directly on the calendar.

All key actions provide visible feedback (loading/status text) to avoid silent clicks.

## Build

```bash
npm run build
```

## Design Notes

- Background palette: warm white and soft neutral gradients
- Accent color: teal (`#0F766E`)
- Typography mix: editorial heading + clean sans body
- Minimal visual noise, emphasis on spacing and breathable panels

## Docs

- `docs/prd.md`: product scope and planning notes

## License

MIT. See `LICENSE`.
