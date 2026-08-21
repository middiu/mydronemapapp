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

const casaRules = data.casa_baseline?.rules || [];
const airports = data.controlled_airports || [];
const malformedAirports = airports.filter(
  (a) => !a.name || !Number.isFinite(a.lat) || !Number.isFinite(a.lon) || !Number.isFinite(a.exclusion_km),
);

if (casaRules.length === 0) {
  console.error('casa_baseline.rules is empty');
  process.exit(1);
}
if (malformedAirports.length) {
  console.error('controlled_airports has malformed entries:');
  malformedAirports.forEach((a) => console.error(`  - ${JSON.stringify(a)}`));
  process.exit(1);
}

console.log(`✓ rules.json valid (v${data.metadata?.version}, last_updated ${data.metadata?.last_updated})`);
console.log(`  ${airports.length} controlled airports, ${casaRules.length} CASA rules`);