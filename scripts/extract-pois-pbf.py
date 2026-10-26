#!/usr/bin/env python3
"""Offline alternative to fetch-pois.py: reads a Geofabrik OpenStreetMap extract
(https://download.geofabrik.de/africa/kenya.html, ODbL 1.0) and produces the same
data/pois.json. Used when the public Overpass instances are at capacity.

Usage: python3 scripts/extract-pois-pbf.py /path/to/kenya-latest.osm.pbf
Requires: pip install osmium
"""
import json, math, sys, datetime
import osmium

ANCHORS = json.load(open("data/anchors.json"))
RADIUS = 2500
PER_CATEGORY = 4
CATS = ["restaurant","hospital","pharmacy","shopping","transport","education","fitness","park","business"]
BBOX = (-1.40, 36.65, -1.17, 36.90)

def haversine(a, b, c, d):
    R = 6371008.8
    p1, p2 = math.radians(a), math.radians(c)
    dp, dl = math.radians(c - a), math.radians(d - b)
    h = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(h))

def classify(t):
    am, sh, le, hc = t.get("amenity"), t.get("shop"), t.get("leisure"), t.get("healthcare")
    if am in ("restaurant","cafe"): return "restaurant", am
    if am in ("hospital","clinic") or hc in ("hospital","clinic"): return "hospital", am or hc
    if am == "pharmacy" or hc == "pharmacy": return "pharmacy", "pharmacy"
    if sh in ("supermarket","mall") or am == "marketplace": return "shopping", sh or am
    if t.get("highway") == "bus_stop" or am in ("bus_station","taxi") or t.get("railway") == "station": return "transport", t.get("highway") or am or "station"
    if am in ("school","university","college"): return "education", am
    if le in ("fitness_centre","sports_centre"): return "fitness", le
    if le in ("park","nature_reserve","garden") or t.get("tourism") in ("attraction","museum"): return "park", le or t.get("tourism")
    if t.get("office") or t.get("building") == "office": return "business", t.get("office") or "office"
    return None, None

class H(osmium.SimpleHandler):
    def __init__(self):
        super().__init__(); self.rows = []
    def add(self, kind, oid, tags, lat, lon):
        if not (BBOX[0] <= lat <= BBOX[2] and BBOX[1] <= lon <= BBOX[3]): return
        t = {k.k: k.v for k in tags}
        if "name" not in t: return
        cat, sub = classify(t)
        if not cat: return
        self.rows.append((kind, oid, t, lat, lon, cat, sub))
    def node(self, n):
        if n.tags and n.location.valid(): self.add("node", n.id, n.tags, n.location.lat, n.location.lon)
    def way(self, w):
        if not w.tags or "name" not in w.tags: return
        pts = [(nd.location.lat, nd.location.lon) for nd in w.nodes if nd.location.valid()]
        if pts: self.add("way", w.id, w.tags, sum(p[0] for p in pts)/len(pts), sum(p[1] for p in pts)/len(pts))

pbf = sys.argv[1]
h = H(); h.apply_file(pbf, locations=True)
print("candidates in Nairobi bbox:", len(h.rows), file=sys.stderr)
out = {"source": "OpenStreetMap (Geofabrik Kenya extract)", "source_url": "https://download.geofabrik.de/africa/kenya.html",
       "licence": "ODbL-1.0", "attribution": "© OpenStreetMap contributors", "licence_url": "https://www.openstreetmap.org/copyright",
       "radius_m": RADIUS, "method": "Straight-line (haversine) distance from the listing's representative anchor; way positions are node centroids.",
       "retrieved_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"), "anchors": {}}
for a in ANCHORS:
    seen, rows = set(), []
    for kind, oid, t, lat, lon, cat, sub in h.rows:
        d = haversine(a["lat"], a["lon"], lat, lon)
        if d > RADIUS: continue
        key = (cat, t["name"].strip().lower())
        if key in seen: continue
        seen.add(key)
        addr = " ".join(x for x in [t.get("addr:housenumber"), t.get("addr:street"), t.get("addr:city")] if x) or None
        rows.append({"osm_type": kind, "osm_id": oid, "name": t["name"].strip(), "category": cat, "subtype": sub,
            "lat": round(lat,7), "lon": round(lon,7), "distance_m": round(d),
            "source_url": f"https://www.openstreetmap.org/{kind}/{oid}", "address": addr,
            "phone": t.get("phone") or t.get("contact:phone"), "website": t.get("website") or t.get("contact:website"),
            "opening_hours": t.get("opening_hours")})
    keep = []
    for cat in CATS:
        keep += sorted([r for r in rows if r["category"] == cat], key=lambda r: r["distance_m"])[:PER_CATEGORY]
    out["anchors"][a["slug"]] = {"count": len(keep), "raw_matches": len(rows), "places": keep}
    print(a["slug"], len(rows), "->", len(keep), file=sys.stderr)
json.dump(out, open("data/pois.json", "w"), indent=1, ensure_ascii=False)
