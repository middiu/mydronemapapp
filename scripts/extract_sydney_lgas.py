#!/usr/bin/env python3
"""Re-extract Sydney metro LGAs from a freshly-downloaded full NSW LGA dataset.

Usage: python3 scripts/extract_sydney_lgas.py /path/to/nsw_lga_full.geojson
"""
import json
import sys

if len(sys.argv) > 1:
    src = sys.argv[1]
else:
    src = '/tmp/nsw_lga_full.geojson'

with open(src) as f:
    data = json.load(f)

bbox_sydney = (-34.1, 150.7, -33.35, 151.4)

def in_sydney_bbox(geom):
    coords = geom['coordinates']
    polys = coords if geom['type'] == 'MultiPolygon' else [coords]
    minx = miny = 999
    maxx = maxy = -999
    for p in polys:
        for ring in p:
            for x, y in ring:
                if x < minx: minx = x
                if y < miny: miny = y
                if x > maxx: maxx = x
                if y > maxy: maxy = y
    cx = (minx + maxx) / 2
    cy = (miny + maxy) / 2
    return bbox_sydney[0] <= cy <= bbox_sydney[2] and bbox_sydney[1] <= cx <= bbox_sydney[3]

kept = [f for f in data['features'] if in_sydney_bbox(f['geometry'])]
out = {'type': 'FeatureCollection', 'name': 'nsw_sydney_lgas', 'features': kept}
with open('db/nsw_lga.geojson', 'w') as f:
    json.dump(out, f, separators=(',', ':'))
print(f"Wrote {len(kept)} LGAs")