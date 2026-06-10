# Bytebot Documentation

Documentation site for [Bytebot](https://github.com/bytebot-ai/bytebot), built with [Fumadocs](https://fumadocs.dev) and Next.js.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000 to view the docs.

## Production

```bash
npm run build
npm run start
```

## Structure

- `content/docs/` — MDX documentation pages; navigation order is defined by `meta.json` files
- `app/` — Next.js app (docs are served from the site root)
- `components/` — custom MDX components (`ParamField`, `Expandable`)
- `public/` — static assets (images, logos, the Computer Use OpenAPI spec)
