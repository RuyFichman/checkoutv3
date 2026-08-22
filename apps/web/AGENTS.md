<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## CheckoutV3 web rules

- Inherit the repository-wide rules from the root `AGENTS.md`.
- Keep the generated Next.js block above unchanged. Read the relevant installed guide before changing framework APIs.
- Route groups `(auth)` and `(dashboard)` separate public access flows from the authenticated shell; preserve server-side redirects.
- Use `src/lib/api.ts` as the server data-access layer. Browser requests must go through the allowlisted BFF at `app/api/backend/[...path]/route.ts`.
- Never trust a workspace identifier supplied by the browser and never expose session tokens to client-side JavaScript.
- Keep all changed screens responsive and accessible, with explicit loading, empty, error, success and permission states.
- Prefer shared contracts from `@checkout/contracts`, shared primitives from `@checkout/ui` and Lucide icons over local duplicates.
- Add or update Playwright coverage when a change affects authentication, navigation, dashboard access or another critical user journey.
