# MyDroneMap

Local browser-based map for drone flying legality across Australian councils, NSW state
and CASA regulations. Currently scoped to **Greater Sydney, NSW**.

The goal: pick a spot on the map and immediately see whether you can fly there, under which
rules, and where to read the source policy.

## Data model

- `db/schema.json` — JSON Schema describing the structure of `db/rules.json`.
- `db/rules.json` — every rule we track. Edit this to add councils, change status, update dates.
- `db/nsw_lga.geojson` — official NSW LGA boundaries (slimmed down to Sydney metro + nearby).

Each council entry links to the GeoJSON feature via `matches_dataset_name` (an array of
strings, because the dataset uses canonical names like *"Council of the City of Sydney"* while
we display *"City of Sydney"*).

### Status values

| status       | meaning |
|--------------|---------|
| `open`       | No council-specific restrictions beyond CASA baseline. |
| `permit`     | Council approval required before flying on council-managed land. |
| `ban`        | Prohibited on council-managed land (e.g. Willoughby parks under LGA Act 1993 §632). |
| `unknown`    | No public policy found; treat as CASA-only and flag for re-verification. |

Overlays: airport 5.5km exclusion circles drawn from `controlled_airports[]`.

## Run locally

```bash
npm install
npm run dev          # open http://localhost:5173
```

The Vite dev server serves `db/` as static files at `/db/*`, so the React app loads
`/db/rules.json` and `/db/nsw_lga.geojson` directly.

## Validate the rules DB

```bash
npm run validate:rules
```

Cross-checks `db/rules.json` against the JSON Schema and verifies that every council's
`matches_dataset_name` actually appears in the GeoJSON dataset.

## Updating the data

1. Edit `db/rules.json`:
   - Update `metadata.last_updated`.
   - Add a new entry under `councils.<slug>`.
   - Set `matches_dataset_name` to the exact string in `nsw_lga.geojson`.
   - Link sources (URL + title).
2. To bring in a new council, either:
   - re-fetch the NSW dataset and re-extract (see below), or
   - hand-author a small GeoJSON Feature in `db/nsw_lga.geojson`.
3. Run `npm run validate:rules`.
4. Reload the app — Vite hot-reloads JSON.

### Re-extracting the NSW LGA GeoJSON

```bash
# Download latest
curl -L "https://data.gov.au/geoserver/nsw-local-government-areas/wfs?request=getfeature&service=wfs&version=2.0.0&typeNames=nsw-local-government-areas:ckan_f6a00643_1842_48cd_9c2f_df23a3a1dc1e&outputFormat=json&srsName=EPSG:4326" -o /tmp/nsw_lga_full.geojson

# Slim down to Sydney metro using Python (see repo history for the script)
python3 scripts/extract_sydney_lgas.py
```

## Roadmap

- Add more councils progressively (start with Willoughby + adjacent, expand outward).
- Import the official Local Drone Rule Map data from
  [drones.gov.au](https://spatial.infrastructure.gov.au/portal/apps/experiencebuilder/experience/?id=5e871e08e09849308677bf4b9f45ccd9).
- Add suburban-level rules (some councils treat different parks differently).
- Show live CASA airspace (OpenSky / Altitude Angel) as an optional toggle.
- Filter by drone weight (micro ≤250g has different rules within 5.5km of airports).

## Source URLs

- [CASA Drone Safety Rules](https://www.casa.gov.au/drones/drone-rules/drone-safety-rules)
- [CASA Drone Safety Apps](https://www.casa.gov.au/knowyourdrone/drone-safety-apps)
- [NSW Drones in Parks Policy](https://www.environment.nsw.gov.au/topics/parks-reserves-and-protected-areas/park-policies/drones-in-parks)
- [Local Drone Rule Map (Department of Infrastructure)](https://spatial.infrastructure.gov.au/portal/apps/experiencebuilder/experience/?id=5e871e08e09849308677bf4b9f45ccd9)
- [NSW LGA Boundaries — data.gov.au](https://data.gov.au/data/dataset/nsw-local-government-areas)# mydronemapapp
