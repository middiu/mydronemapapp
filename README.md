# MyDroneMap

Browser-based map for recreational drone flying legality across Australian
councils, NSW state and CASA regulations. Currently scoped to
**Greater Sydney, NSW**.

The goal: pick a spot on the map and immediately see whether you can fly there,
under which rules, and where to read the source policy.

> ⚠️ **Unofficial reference only.** This is a hobby project built for fun and
> convenience. It is **not an authoritative source**. Always verify current
> rules directly with CASA, NPWS, your local council, and the relevant land
> manager before flying. Data may be outdated, incomplete, or wrong. By using
> this site you accept that the authors take **no responsibility** for any
> decisions made based on its content.

---

## What it shows

- Sydney-metro NSW councils colour-coded by drone status
- Controlled airport exclusion zones (5.5 km CASA buffer) — Sydney, Bankstown,
  Camden, Richmond
- **Protected areas** (CAPAD terrestrial NSW — national parks, nature reserves,
  state forests) painted as permit-required
- **Smaller airports + helipads** (OurAirports CC0 dataset) with 4 km / 1.4 km
  CASA Part 101 buffers
- Status filter, layer toggles, sidebar council list with direct source links

## Data model

- `db/schema.json` — JSON Schema describing the structure of `db/rules.json`.
- `db/rules.json` — every rule we track. Edit this to add councils, change
  status, update dates.
- `db/nsw_lga.geojson` — official NSW LGA boundaries (slimmed to Sydney metro).
- `db/protected_areas.geojson` — DCCEEW CAPAD 2024 terrestrial NSW
  (Douglas-Peucker simplified to ~2.7 MB).
- `db/aerodromes.csv` — OurAirports AU aerodromes + heliports, deduped against
  the 4 controlled airports.

Each council entry links to the GeoJSON feature via `matches_dataset_name` (an
array of strings, because the dataset uses canonical names like
*"Council of the City of Sydney"* while we display *"City of Sydney"*).

### Status values

| status       | meaning |
|--------------|---------|
| `open`       | No council-specific restrictions beyond CASA baseline. |
| `permit`     | Council approval required before flying on council-managed land. |
| `ban`        | Prohibited on council-managed land (e.g. Willoughby parks under LGA Act 1993 §632). |
| `unknown`    | No public policy found; treat as CASA-only and flag for re-verification. |

### Overlays

| Layer | Source | Buffer |
|---|---|---|
| Controlled airports | `db/rules.json → controlled_airports[]` | 5.5 km CASA |
| Protected areas | `db/protected_areas.geojson` (DCCEEW CAPAD) | n/a — polygon |
| Smaller airports | `db/aerodromes.csv` (OurAirports) | 4 km CASA Part 101 |
| Heliports | `db/aerodromes.csv` (OurAirports, type=heliport) | 1.4 km CASA Part 101 |

## Run locally

```bash
npm install
npm run dev          # open http://localhost:5173
```

The Vite dev server serves `db/` as static files at `/db/*`, so the React app
loads `/db/rules.json`, `/db/nsw_lga.geojson`, `/db/protected_areas.geojson` and
`/db/aerodromes.csv` directly.

## Validate the rules DB

```bash
npm run validate:rules
```

Cross-checks `db/rules.json` against the JSON Schema and verifies that every
council's `matches_dataset_name` actually appears in the GeoJSON dataset.

## Updating the data

1. Edit `db/rules.json`:
   - Update `metadata.last_updated` and bump `metadata.version`.
   - Add or update an entry under `councils.<slug>`.
   - Set `matches_dataset_name` to the exact string in `nsw_lga.geojson`.
   - Link sources (URL + title) — every rule needs a citable source.
2. To bring in a new council, either:
   - re-fetch the NSW dataset and re-extract (see below), or
   - hand-author a small GeoJSON Feature in `db/nsw_lga.geojson`.
3. Run `npm run validate:rules`.
4. Reload the app — Vite hot-reloads JSON.

### Re-extracting the NSW LGA GeoJSON

```bash
curl -L "https://data.gov.au/geoserver/nsw-local-government-areas/wfs?request=getfeature&service=wfs&version=2.0.0&typeNames=nsw-local-government-areas:ckan_f6a00643_1842_48cd_9c2f_df23a3a1dc1e&outputFormat=json&srsName=EPSG:4326" -o /tmp/nsw_lga_full.geojson
python3 scripts/extract_sydney_lgas.py
```

## Deploy

Deployed on **Cloudflare Pages** — free, unlimited bandwidth, global edge
cache, automatic SPA fallback.

### One-time setup

1. **Cloudflare account + Pages project**
   - In [Cloudflare dashboard](https://dash.cloudflare.com/) → **Workers & Pages**
     → **Create application** → **Pages** → **Import from GitHub** (or use the
     direct integration once the repo is connected).
   - Framework preset: **Vite**.
   - Build command: `npm run build`.
   - Build output directory: `dist`.
   - Node version: **20** (set via `NODE_VERSION=20` env var in the Pages
     project, or include `.nvmrc` with `20` — already in repo).

2. **GitHub Actions deployment (this repo's setup)**

   The workflow at `.github/workflows/deploy.yml` builds on every push and PR,
   validates the rules DB first, then deploys to Cloudflare Pages via
   `cloudflare/pages-action@v1`. Configure two repo secrets:

   - `CLOUDFLARE_API_TOKEN` — Cloudflare → My Profile → API Tokens →
     Create Token → **Edit Cloudflare Pages** template. Scope to your Pages
     project account.
   - `CLOUDFLARE_ACCOUNT_ID` — Cloudflare dashboard right sidebar → **Account
     ID**.

   Add both under repo Settings → Secrets and variables → Actions.

3. **What gets deployed**

   ```
   dist/
   ├── index.html
   ├── _headers           # cache rules for /db/* and /assets/*
   ├── assets/            # hashed JS + CSS (immutable, 1y cache)
   └── db/                # rules.json, schema.json, nsw_lga.geojson,
                          # protected_areas.geojson, aerodromes.csv,
                          # aerodromes.json
   ```

### Workflow behaviour

| Event | Action |
|---|---|
| Push to `main` | Validate → Build → Deploy to production (`https://mydronemap.pages.dev`) |
| Pull request | Validate → Build → Deploy to preview URL (per PR) |
| Push to other branches | Validate → Build (no deploy) |

### Local preview of production build

```bash
npm run build
npm run preview    # serves dist/ at http://localhost:4173
```

### SPA routing

Vite outputs a static SPA. Direct visits to non-root paths (e.g.
`/db/rules.json`) work because they're real files in `dist/db/`. No
`_redirects` file needed for this app — only `index.html` would need a
fallback if you add client-side routing later.

### Custom domain

Cloudflare Pages → **Custom domains** → add your domain. Free SSL auto-provisioned.

### Cache behaviour

- `/db/*` → 1 hour browser cache, edge-cached indefinitely until redeploy
- `/assets/*` → 1 year immutable (Vite hashes filenames)
- HTML at root → Cloudflare default (no cache header set)

## Roadmap

- More councils progressively (start with Willoughby + adjacent, expand outward).
- Live CASA airspace (OpenSky / Altitude Angel) as an optional toggle.
- Filter by drone weight (micro ≤250g has different rules within 5.5 km of airports).
- Suburban-level rules (some councils treat different parks differently).
- Feedback form for users to report council rules they couldn't find.

## Source URLs

- [CASA Drone Safety Rules](https://www.casa.gov.au/drones/drone-rules/drone-safety-rules)
- [CASA Drone Safety Apps](https://www.casa.gov.au/knowyourdrone/drone-safety-apps)
- [NSW Drones in Parks Policy](https://www.environment.nsw.gov.au/topics/parks-reserves-and-protected-areas/park-policies/drones-in-parks)
- [Local Drone Rule Map (Department of Infrastructure)](https://spatial.infrastructure.gov.au/portal/apps/experiencebuilder/experience/?id=5e871e08e09849308677bf4b9f45ccd9)
- [NSW LGA Boundaries — data.gov.au](https://data.gov.au/data/dataset/nsw-local-government-areas)
- [DCCEEW CAPAD 2024 (terrestrial protected areas)](https://gis.environment.gov.au/gispubmap/rest/services/ogc_services/CAPAD/MapServer/0)
- [OurAirports (David Megginson, CC0)](https://davidmegginson.github.io/ourairports-data/)

## Attribution

- Council polygons: NSW Government (data.gov.au), open licence
- Protected areas: Department of Climate Change, Energy, the Environment and
  Water (DCCEEW) — CAPAD 2024, CC-BY 4.0
- Aerodromes + heliports: OurAirports (David Megginson), CC0 1.0
- Base map: OpenStreetMap contributors, ODbL
- This project is not affiliated with CASA, NPWS, DCCEEW, OurAirports, or any
  council. It's a personal hobby project. Verify everything.

## Licence

Application code: MIT. Data files retain their original licences (see
`metadata.notes` in `db/rules.json` and the source URLs above).
