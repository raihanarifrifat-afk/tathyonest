# TathyoNest 2.0

React + Vite frontend for TathyoNest.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Vite writes the static site to `dist/`. The existing admin panel is copied from `public/admin.html` to `dist/admin.html`.

## Cloudflare Pages

Use these build settings:

- Build command: `npm run build` (or keep `node build.js`, which delegates to Vite)
- Build output directory: `dist`
- Root directory: `/`
- Build environment: Node.js 20 or newer

The React app reads published job, result and exam records from the existing Supabase REST API using the site's public publishable key. Never put a Supabase service-role key in frontend code.

## Migration notes

- The original monolithic site is preserved as `legacy.html` on this branch for rollback/reference.
- The current admin panel is preserved at `/admin.html`.
- The React migration is isolated on `feature/tathyonest-react-2`; production `main` is not changed.
- Some legacy modules (MCQ test engine, complete CV workflow, image/signature presets, alert delivery and full legal-page content) still need feature-by-feature migration and verification before replacing production.
