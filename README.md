# eronikki

eronikki is a manga reader for two public catalogs: the [nhentai API v2](https://nhentai.net/api/v2/docs) and [Hitomi](https://hitomi.la) through [`node-hitomi`](https://github.com/h2owater425/node-hitomi). It lists newest and popular galleries, searches, opens a gallery, and reads in a full-screen viewer.

The catalog is adult. An 18+ gate sits in front of it. Galleries tagged lolicon, shotacon, toddlercon, oppai loli, lolibaba, kodomo doushi, kodomo only, kindergarten uniform, age regression, or the low-count variants of those tags are hidden.

The library switch in the header chooses nhentai or Hitomi. nhentai covers and pages load in the browser from nhentai’s image CDN. Hitomi’s CDN refuses a request that does not carry `Referer: https://hitomi.la/`, which a browser will not send for another site, so those images are loaded through an edge cache instead of through the app server.

## Run it

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123). Confirm you are 18, then browse. With no object-storage settings, catalog JSON is stored in `data/cache` on this machine. The tag list on the home page and on Search lets you require a tag, exclude it with a second click, and clear it with a third. Search still accepts source syntax (`language:english`, `artist:name`, and on nhentai `pages:>20` or `-tag:name`). Open a cover to read. Arrow keys, `A`/`D`, and space turn pages. `M` switches between single page and long strip. Progress stays in this browser.

## Cache

Every catalog response is stored as a small JSON object and reused:

| What | Fresh | Then served stale while a refresh runs |
| --- | --- | --- |
| nhentai gallery | 6 hours | 7 days |
| Hitomi gallery or card | 2 hours | 1 day |
| Newest page | 1 minute | 15–30 minutes |
| Search | 2 minutes | 30 minutes |
| Popular | 10 minutes | 6 hours |
| Tags | 12 hours | 7 days |

A fresh hit never calls nhentai or Hitomi. A stale hit returns the saved copy and refreshes one request in the background. Identical requests that arrive together share one upstream call, and nhentai calls are still paced per endpoint. Random is not cached. Image bytes are not stored.

The live catalog sits in a Cloudflare R2 bucket named `eronikki`. The app reaches it through `CACHE_HTTP_URL`, a small worker that only accepts one bearer token. Any S3-compatible API still works through the `CACHE_S3_*` variables. R2’s free allowance covers the catalog (10 GB, 1 million writes, 10 million reads a month) and R2 does not charge for bandwidth.

```bash
CACHE_S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
CACHE_S3_BUCKET=eronikki
CACHE_S3_REGION=auto
CACHE_S3_ACCESS_KEY_ID=
CACHE_S3_SECRET_ACCESS_KEY=
```

Create the bucket, then an R2 API token with object read and write on that bucket only. `GET /api/health` reports `"cache": "s3"` or `"cache": "disk"`.

`NHENTAI_API_KEY` is optional. It raises nhentai’s shared cap. The cache is what keeps a normal day under that cap.

## A month inside $20

The app server and the catalog storage stay separate. Images never sit on either one.

| Piece | Role | About |
| --- | --- | --- |
| Hetzner CX23 | The only virtual machine. 2 shared vCPU, 4 GB RAM, 40 GB disk, 20 TB traffic. | €5.49 plus a €0.50 IPv4 address, before VAT |
| Cloudflare R2 | Catalog JSON. Survives a rebuild of the machine. | $0 inside the free allowance |
| Cloudflare DNS, proxied | Caches `/api/hitomi-image/*.webp` at the edge, because those URLs end in `.webp` and the response is `public, max-age=86400`. HTML stays dynamic. | $0 |
| Domain | Whatever you already pay for a name. | not part of the $20 |

That is about €6–8 for the machine. VAT depends on the country and still leaves room under $20. Do not add a second machine, a database, or stored image files. A CX33 (4 vCPU, 8 GB, about €8.49 before the IPv4) is the step up if CPU, not bandwidth, is the limit. It still fits.

Hitomi images can also move to their own hostname. `workers/hitomi-image.js` fetches with the required referer and caches for a day. Deploy it with Wrangler, then set `NEXT_PUBLIC_HITOMI_IMAGE_BASE` to that worker’s URL and rebuild. The Workers free plan is 100,000 requests a day. Past that, the paid plan is $5 a month. Leave the variable empty and put the site itself behind Cloudflare instead; the app route is the same cache key.

```bash
cp .env.example .env
# fill in SITE_ADDRESS, the R2 keys, and the worker URL if you use one
docker compose up -d --build
```

Point the domain at the machine and leave Cloudflare’s proxy on. Caddy fetches a certificate when `SITE_ADDRESS` is a public hostname. The container listens on port 3000 and keeps the Node heap at 768 MB so the rest of the 4 GB stays free for the catalog index Hitomi keeps in memory.

Render’s free instance cannot carry this traffic, and its disk disappears when the instance sleeps, which throws away the cache. This compose file is the deployment.

## Tests

```bash
npm test
```
