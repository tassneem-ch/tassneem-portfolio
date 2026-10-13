# Tasnim Cherif — portfolio

A single-page animated portfolio built from real project data pulled from
[github.com/tassneem-ch](https://github.com/tassneem-ch).

The hero paints her photo with the background cut out, and the rest of the
page animates on scroll: a particle starfield canvas, drifting gradient orbs,
a custom cursor, magnetic buttons, 3D-tilt project cards, marquees and
staggered reveals.

## Run it locally

There is no build step — it is plain HTML, CSS and JavaScript.

```bash
cd public
python3 -m http.server 3000
# then open http://localhost:3000
```

Or run the zero-dependency Node server from the repo root (what Hostinger
runs): `npm start` → http://localhost:3000

## Editing and deploying (Hostinger)

The live site at `https://tassneem.chrif.net` is deployed from the
**`hostinger-static`** branch (site files at the repo root). `main` is the
working branch: edit files under `public/` here.

**Safe deploy flow:**

1. Edit files under `public/` (content, styles, scripts).
2. Preview locally: `npm start` → http://localhost:3000
3. Deploy:
   ```powershell
   powershell -ExecutionPolicy Bypass -File deploy.ps1
   ```
   The script smoke-tests the site locally first (server start, page +
   assets return 200, every `href`/`src` in `index.html` resolves) and
   **refuses to push if anything fails** — the live site can't get a
   broken build. It then syncs `public/` to the `hostinger-static` branch
   and confirms the live URL returns 200 after Hostinger redeploys.
4. Commit the same change to `main` for history:
   `git add -A; git commit -m "describe it"; git push`

**Rollback** (if a deploy ever breaks the site):

```powershell
deploy.ps1 -Rollback                # list the last 10 live deploys
deploy.ps1 -Rollback -Commit <sha>  # instantly revert the site to one
```

Manual alternative: push `public/` contents to the `hostinger-static`
branch yourself — Hostinger redeploys on every push to that branch.

## Layout

```
public/
  index.html          the whole page
  app.css             all styling and keyframes
  webfonts.css        @font-face rules for the self-hosted webfonts
  app.js              petal canvas, scroll reveals, timeline draw, nav
  assets/
    tasnim-cutout.png   her photo, background removed (transparent, 900×900)
    tasnim-tilt.png     head-tilt twin of the same photo (same canvas, 900×900)
    fonts/            Quicksand + Nunito variable woff2 (latin + latin-ext)
    mark.svg          sakura favicon
worker.js             static-asset entry point
site.manifest.json    deploy manifest
```

## The hero photo

`assets/tasnim-cutout.png` is her digital portrait: background removed
(edge flood-fill to transparency), 900×900 RGBA, 288 KB. The blob gradient
shows through the transparent areas, so it reads as a cut-out. It fills the
blob frame with `object-fit: cover`, so any square image dropped in at the
same path keeps the layout identical.

It floats gently and zooms slowly on hover with a soft pink ring glow.
The floating chips, rings and gradient blob around it are separate
decorative layers.

**Head-tilt hover:** `assets/tasnim-tilt.png` is a second export of the
same photo with a slight head tilt, background-removed and aligned to the
same canvas (body pixels match the base layer to <1/255 on average).
Both layers are stacked in `.portrait-stack`; hovering anywhere in the
hero cross-fades to the tilt (350 ms) with a barely-there lean
(`rotate(1.5deg) scale(1.02)`). Touch devices always show the neutral
version; the hover effect also runs under `prefers-reduced-motion`
(owner's call — ambient motion like petals still respects it).
Tweakables are commented in the `AVATAR HEAD-TILT` block in `app.css`.

**Swapping in a new photo:** replace `public/assets/tasnim-cutout.png`
with any square image — an opaque one still works (it just covers the
blob), a transparent PNG keeps the cut-out look. Nothing else needs
changing — the frame, glow, chips and mask all scale with it.

## Deploying

The whole site is the `public/` folder — plain files, no build step, no
dependencies. Point any static host at it.

| Host | Setting |
|---|---|
| **Netlify** | drag `public/` in, or import the repo — `netlify.toml` already sets `publish = "public"` |
| **Vercel** | import repo — `vercel.json` already sets `"outputDirectory": "public"` |
| **Cloudflare Pages** | build command: *(none)* · output dir: `public` |
| **GitHub Pages** | publish the `public/` folder (e.g. an Actions workflow with `path: public`) |
| **Firebase / Render / Fly static** | serve `public/` as the document root |

`public/_headers` carries the security headers and cache policy on hosts that
understand it: **everything revalidates (`no-cache`), only `/assets/fonts/*`
is pinned immutable** (fonts get a new filename whenever replaced) — this
guarantees in-place edits to CSS/JS/images always show up immediately;
`netlify.toml` and `vercel.json` repeat the same headers so it works on those
hosts too. `robots.txt` and `sitemap.xml` are
included — update the domain in `sitemap.xml` once you know your URL.

`worker.js` + `site.manifest.json` exist only for the Cloudflare-Worker-style
entry point used here; they are optional on a normal static host.

### Hostinger — Node.js web app (recommended)

The site ships with a **zero-dependency Node.js server** (`server.js`), so it
runs as a real Node app on Hostinger's Business / Cloud plans. No npm packages
are used, which means `npm install` cannot fail and the cold start is instant.

Upload-ready archive: **`hostinger-nodejs.zip`** (contains `server.js`,
`package.json`, and `public/`).

**Option A — upload the zip**

1. hPanel → **Websites** → **Create Website** → **Web App** →
   **Upload your website files** → pick `hostinger-nodejs.zip`.
2. Framework: select **Other** (it may auto-detect). Build settings:
   - Entry file: `server.js`
   - Output directory: `public` (nothing is built; this is just the static root)
3. Deploy. Hostinger injects the `PORT` env var and the server picks it up
   automatically.

**Option B — GitHub integration**

1. hPanel → **Websites** → **Create Website** → **Web App** →
   **Import Git Repository** → paste
   `https://github.com/tassneem-ch/tassneem-portfolio` (public, so no auth needed).
2. Same build settings as above: entry `server.js`, output `public`.
3. Every push to `main` redeploys automatically.

**What the server gives you**

- Correct MIME types for every asset (verified against the live responses)
- gzip for HTML/CSS/JS (~4× smaller on `styles.css`: 29 KB → 7 KB)
- `ETag` + `304 Not Modified` revalidation; `immutable` caching for `.woff2` fonts only — all other files revalidate so in-place edits appear immediately
- A styled `404.html` matching the site palette
- Path-traversal and dotfile protection (`.htaccess`, `.git`, `.env` → 404)
- The same security headers as the Apache/Netlify/Cloudflare configs
- `process.env.PORT` support (falls back to 3000 locally)

`npm start` runs it locally; `node server.js` does the same.

### Hostinger (shared hosting / Business plan)

An upload-ready archive is checked in: **`hostinger-public_html.zip`** — its
contents sit at the zip root, so it extracts straight into `public_html`.

1. Hostinger **hPanel** → **Websites** → your plan → **Manage** →
   **File Manager** → open **`public_html`**.
2. Upload `hostinger-public_html.zip`, select it, click **Extract**, then
   delete the zip.
3. hPanel → **Security** → **SSL** → install the free SSL (included on all
   plans); the site then forces HTTPS.
4. Optional: hPanel → **Files** → **FTP Accounts** to upload via FTP instead.

What ships for Apache:

- `public/.htaccess` — security headers, gzip compression, 1-year caching for
  images/fonts, `-Indexes` (no directory listing). Every asset path in the
  site is relative, so it works at the domain root *or* in a subfolder.
- No build step, no Node, no database — just static files.

`sitemap.xml` already points at the live domain
(`https://tassneem.chrif.net`).

## Accessibility and performance notes

- `prefers-reduced-motion: reduce` disables the canvas, the cursor, the
  blinking and all keyframe animations, and shows every section immediately.
- A `<noscript>` block removes the loader so the page is readable without JS.
- Fonts are self-hosted, so there is no third-party request and no layout
  flash from a remote stylesheet.
