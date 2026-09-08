# Hello World

A minimal static website — plain HTML, CSS and JavaScript, no backend, no build
step. Everything runs in the visitor's browser, so it can be served by any
static host. It is set up for [GitHub Pages](https://pages.github.com/).

## Features

- A greeting that cycles through 12 languages (with correct `lang` and RTL
  handling for Arabic)
- Light/dark theme that follows the operating system and remembers an explicit
  choice in `localStorage`, applied before first paint so there is no flash
- Responsive down to a 320 px viewport
- WCAG AA contrast in both themes, visible focus rings, `prefers-reduced-motion`
  support
- A self-contained `404.html` that works on user sites and project sites alike

## Project structure

```
.
├── index.html              # The page
├── 404.html                # Custom not-found page (self-contained styles)
├── .nojekyll               # Tell GitHub Pages to skip the Jekyll build
├── assets/
│   ├── favicon.svg
│   ├── css/style.css       # Design tokens + layout
│   └── js/main.js          # Greeting cycling + theme toggle
├── tests/                  # Local test harness (not part of the site)
└── docs/
    └── deploy-github-pages.md
```

## Run it locally

Any static server works. The repository ships a tiny one that mirrors GitHub
Pages behaviour (directory URLs resolve to `index.html`, unknown paths return
`404.html`):

```bash
cd tests
npm install     # only needed once, and only for the tests
node serve.js   # http://127.0.0.1:8765/
```

Without Node, `python -m http.server 8765` from the repository root also works.

> Opening `index.html` directly with `file://` mostly works, but `localStorage`
> is restricted on some browsers there. Prefer a local server.

## Tests

With the server running on port 8765, in another terminal:

```bash
cd tests
node dom.test.js        # structure + behaviour under jsdom
node browser.test.js    # responsive layout, interactions, screenshots (Chrome)
node contrast.test.js   # WCAG contrast audit in light and dark
```

`browser.test.js` and `contrast.test.js` drive an installed Chrome or Edge via
`puppeteer-core`. Point them at your binary with `CHROME_PATH` if it is not at
the default Windows Chrome location. Screenshots land in `tests/screenshots/`.

## Deploying

See [docs/deploy-github-pages.md](docs/deploy-github-pages.md).
