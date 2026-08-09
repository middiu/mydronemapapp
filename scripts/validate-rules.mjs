import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const schema = JSON.parse(readFileSync(join(root, 'db/schema.json'), 'utf8'));
const data = JSON.parse(readFileSync(join(root, 'db/rules.json'), 'utf8'));

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const ok = validate(data);
if (!ok) {
  console.error('rules.json failed schema validation:');
  console.error(JSON.stringify(validate.errors, null, 2));
  process.exit(1);
}
console.log(`✓ rules.json valid (v${data.metadata?.version}, last_updated ${data.metadata?.last_updated})`);
console.log(`  ${Object.keys(data.councils || {}).length} councils, ${data.controlled_airports?.length || 0} airports`);

// Cross-check: every council's matches_dataset_name should exist in nsw_lga.geojson
try {
  const geo = JSON.parse(readFileSync(join(root, 'db/nsw_lga.geojson'), 'utf8'));
  const datasetNames = new Set(geo.features.map((f) => f.properties?.LGA_NAME).filter(Boolean));
  let matched = 0;
  let unmatched = [];
  Object.entries(data.councils || {}).forEach(([key, c]) => {
    const names = Array.isArray(c.matches_dataset_name) ? c.matches_dataset_name : [c.matches_dataset_name];
    const hit = names.find((n) => datasetNames.has(n));
    if (hit) matched++;
    else unmatched.push({ key, names });
  });
  console.log(`✓ ${matched}/${Object.keys(data.councils).length} councils matched against GeoJSON dataset`);
  if (unmatched.length) {
    console.warn(`  ⚠ ${unmatched.length} council(s) without a matching polygon:`);
    unmatched.forEach((u) => console.warn(`    - ${u.key}: tried ${JSON.stringify(u.names)}`));
  }
} catch (e) {
  console.warn('Could not cross-check against nsw_lga.geojson:', e.message);
}