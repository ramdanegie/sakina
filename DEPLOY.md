# Deploy

The app builds to plain static HTML — `out/index.html` plus one folder per
route. There is no Node process to keep alive, no database, and no API keys.
That means it runs on the cheapest hosting you have.

## What you need to prepare

**On your machine (to build):**

| Requirement | Why |
|---|---|
| Node.js 20+ | Build toolchain (`node -v` to check) |
| pnpm | `npm i -g pnpm` |
| Internet during build | The build fetches the reciter catalogue to pre-render one page per reciter. If it is unreachable, the build falls back to a built-in list of ~20 well-known reciters instead of failing. |

**On the server:** any web host that can serve static files. Nothing else.
Shared hosting (DomaiNesia/cPanel), Netlify, Cloudflare Pages, Vercel, GitHub
Pages, nginx, or an S3 bucket all work.

**What you do NOT need:** Node on the server, a database, a `.env` file, API
keys, SSL certificates beyond whatever your host already provides.

## Quickest path (shared hosting / cPanel)

```bash
./deploy.sh
```

Produces `quran-audio-YYYYMMDD-HHMM.zip`. Then in cPanel:

1. **File Manager** → open `public_html`
2. **Upload** the zip
3. Right-click it → **Extract**
4. Delete the zip

Done. The `.htaccess` for caching and clean URLs is already inside.

## Deploying over SSH

Edit the two variables at the top of `deploy.sh`:

```bash
LIVE_DIR="/home/youruser/public_html"
SSH_HOST="youruser@yourserver.com"   # leave empty for a local path
```

Then:

```bash
./deploy.sh --rsync
```

It asks for confirmation before mirroring, because `rsync --delete` removes
anything already in the target directory.

## Checking the build before you ship

```bash
./deploy.sh --local     # builds, then serves at http://localhost:8080
```

Or against an existing build:

```bash
pnpm preview
```

## Serving from a subdirectory

To host at `example.com/quran` rather than the domain root:

```bash
BASE_PATH=/quran ./deploy.sh
```

Without this the page loads but its CSS and JavaScript 404, because the asset
paths are absolute.

## Other hosts

**Netlify / Cloudflare Pages / Vercel**

| Setting | Value |
|---|---|
| Build command | `pnpm build:static` |
| Output directory | `out` |
| Node version | `20` or higher |

**nginx**

```nginx
server {
    root /var/www/sakina;
    index index.html;

    # Clean URLs: /reciters/name/ resolves to that folder's index.html
    location / {
        try_files $uri $uri/ $uri/index.html =404;
    }

    location /_next/static/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

**Node hosting (Passenger, PM2, Docker)**

If you would rather run a Node server, build the standalone bundle instead:

```bash
pnpm build:standalone
# deploy .next/standalone/ and run: node server.js
```

The static export is the better default here — this app does no server-side
work, so a Node process would only add something else to keep running.

## After deploying — verify

1. Open the site. The reciter list should populate within a second or two.
2. Tap any surah. Audio should start; the mini player appears.
3. Open the player, tap the background-sound chip, pick **Rain**. The backdrop
   changes and rain fades in under the recitation.
4. Tap the download icon on a surah, then reload with the network off. The
   downloaded surah should still play.

If the reciter list stays empty, open the browser console. A CORS or network
error there points at the upstream audio API, not at your hosting.

## Updating later

Re-run the same command. `--rsync` mirrors the new build over the old one;
the zip path just needs a re-extract. HTML is served with
`must-revalidate`, so users get the new version on their next load rather
than a stale cached shell.

## Notes on cost

Recitation audio is streamed directly from public CDNs and is never proxied
through your server, so bandwidth stays close to zero regardless of how many
people listen. The whole deployed site is roughly 9 MB.
