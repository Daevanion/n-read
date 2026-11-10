# eronikki

eronikki is a manga reader for the public [nhentai API v2](https://nhentai.net/api/v2/docs). It lists newest and popular galleries, searches with nhentai query syntax, opens a gallery page, and reads in a full-screen viewer.

The catalog is adult. An 18+ gate sits in front of it. Galleries tagged lolicon, shotacon, toddlercon, oppai loli, lolibaba, kodomo doushi, kodomo only, kindergarten uniform, age regression, or the low-count variants of those tags are hidden.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123). Confirm you are 18, then browse. The tag list on the home page and on Search lets you require a tag, exclude it with a second click, and clear it with a third. You can also look up a tag, artist, character, parody, or group and add it. Search still accepts nhentai syntax (`language:english`, `artist:name`, `pages:>20`, `-tag:name`). Open a cover to read. Arrow keys, `A`/`D`, and space turn pages. `M` switches between single page and long strip. Progress stays in this browser.

Images are fetched through `/api/media` from nhentai CDN hosts only. Metadata comes from `https://nhentai.net/api/v2`. No account is required.

## Optional API key

Anonymous calls share a per-IP rate limit. If you have an nhentai API key, set `NHENTAI_API_KEY` in the environment. Without it, eronikki uses the public anonymous API.

## Host it

The site is live at [eronikki.onrender.com](https://eronikki.onrender.com). The deploy source is [github.com/Daevanion/n-read](https://github.com/Daevanion/n-read).

Vercel does not allow this kind of site. Fly.io’s terms ban pornographic content on their machines, and Railway bans sexually explicit content. [Render](https://render.com) does allow legal adult sites that stay inside its acceptable-use rules, and it can run this Next.js server.

`render.yaml` builds the app, starts it on Render’s `PORT`, and checks `/api/health`. The free instance sleeps after a quiet stretch; the next visit wakes it. A larger plan in that file (`0.5c-512mb`) keeps it awake.

`NHENTAI_API_KEY` is optional. Add it in the Render service’s environment only if you have a key. The public API works without it.

DigitalOcean also allows lawful adult sites if you later want a droplet instead of Render.

## Tests

```bash
npm test
```
