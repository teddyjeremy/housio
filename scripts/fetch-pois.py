#!/usr/bin/env python3
"""Fetch nearby points of interest for each demonstration anchor from OpenStreetMap
via the Overpass API. Data (c) OpenStreetMap contributors, ODbL 1.0.

Usage: python3 scripts/fetch-pois.py  -> writes data/pois.json
Respects Overpass usage policy: one query at a time, pause between queries,
identifying User-Agent, results cached in the repository.
"""
import json, math, time, urllib.parse, urllib.request, datetime, sys

ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
UA = "Housio-demo-data/1.0 (https://github.com/teddyjeremy/housio)"
ANCHORS = json.load(open("data/anchors.json"))
RADIUS = 2500
PER_CATEGORY = 4

CATS = {
  "restaurant": ['nwr["amenity"~"^(restaurant|cafe)$"]["name"]'],
  "hospital": ['nwr["amenity"~"^(hospital|clinic)$"]["name"]', 'nwr["healthcare"~"^(hospital|clinic)$"]["name"]'],
  "pharmacy": ['nwr["amenity"="pharmacy"]["name"]', 'nwr["healthcare"="pharmacy"]["name"]'],
  "shopping": ['nwr["shop"~"^(supermarket|mall)$"]["name"]', 'nwr["amenity"="marketplace"]["name"]'],
  "transport": ['nwr["highway"="bus_stop"]["name"]', 'nwr["amenity"~"^(bus_station|taxi)$"]["name"]', 'nwr["railway"="station"]["name"]'],
  "education": ['nwr["amenity"~"^(school|university|college)$"]["name"]'],
  "fitness": ['nwr["leisure"~"^(fitness_centre|sports_centre)$"]["name"]'],
  "park": ['nwr["leisure"~"^(park|nature_reserve|garden)$"]["name"]', 'nwr["tourism"~"^(attraction|museum)$"]["name"]'],
  "business": ['nwr["office"]["name"]["building"~"^(office|commercial)$"]', 'nwr["building"="office"]["name"]'],
}

def haversine(a, b, c, d):
    R = 6371008.8
    p1, p2 = math.radians(a), math.radians(c)
    dp, dl = math.radians(c - a), math.radians(d - b)
    h = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(h))

def query(q):
    last = None
    for ep in ENDPOINTS:
        for attempt in range(3):
            try:
                req = urllib.request.Request(ep, data=urllib.parse.urlencode({"data": q}).encode(), headers={"User-Agent": UA})
                with urllib.request.urlopen(req, timeout=120) as r:
                    return json.load(r), ep
            except Exception as e:
                last = e; time.sleep(8*(attempt+1))
    raise RuntimeError(f"all endpoints failed: {last}")

out = {"source": "OpenStreetMap via Overpass API", "licence": "ODbL-1.0", "attribution": "© OpenStreetMap contributors",
       "licence_url": "https://www.openstreetmap.org/copyright", "radius_m": RADIUS,
       "retrieved_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"), "anchors": {}}
for a in ANCHORS:
    lat, lon = a["lat"], a["lon"]
    parts = []
    for cat, sels in CATS.items():
        for s in sels: parts.append(f'{s}(around:{RADIUS},{lat},{lon});')
    q = f"[out:json][timeout:90];({''.join(parts)});out center tags;"
    data, ep = query(q)
    seen, rows = set(), []
    for el in data["elements"]:
        t = el.get("tags", {}); name = t.get("name")
        plat = el.get("lat") or el.get("center", {}).get("lat"); plon = el.get("lon") or el.get("center", {}).get("lon")
        if not name or plat is None: continue
        cat = None
        am, sh, le = t.get("amenity"), t.get("shop"), t.get("leisure")
        if am in ("restaurant","cafe"): cat="restaurant"
        elif am in ("hospital","clinic") or t.get("healthcare") in ("hospital","clinic"): cat="hospital"
        elif am=="pharmacy" or t.get("healthcare")=="pharmacy": cat="pharmacy"
        elif sh in ("supermarket","mall") or am=="marketplace": cat="shopping"
        elif t.get("highway")=="bus_stop" or am in ("bus_station","taxi") or t.get("railway")=="station": cat="transport"
        elif am in ("school","university","college"): cat="education"
        elif le in ("fitness_centre","sports_centre"): cat="fitness"
        elif le in ("park","nature_reserve","garden") or t.get("tourism") in ("attraction","museum"): cat="park"
        elif t.get("office") or t.get("building")=="office": cat="business"
        if not cat: continue
        key = (cat, name.lower())
        if key in seen: continue
        seen.add(key)
        addr = " ".join(x for x in [t.get("addr:housenumber"), t.get("addr:street"), t.get("addr:city")] if x) or None
        rows.append({"osm_type": el["type"], "osm_id": el["id"], "name": name, "category": cat,
            "subtype": am or sh or le or t.get("highway") or t.get("tourism") or t.get("office") or t.get("healthcare"),
            "lat": round(plat,7), "lon": round(plon,7),
            "distance_m": round(haversine(lat, lon, plat, plon)),
            "source_url": f"https://www.openstreetmap.org/{el['type']}/{el['id']}",
            "address": addr, "phone": t.get("phone") or t.get("contact:phone"), "website": t.get("website") or t.get("contact:website"),
            "opening_hours": t.get("opening_hours")})
    keep = []
    for cat in CATS:
        keep += sorted([r for r in rows if r["category"]==cat], key=lambda r: r["distance_m"])[:PER_CATEGORY]
    out["anchors"][a["slug"]] = {"endpoint": ep, "count": len(keep), "raw_matches": len(rows), "places": keep}
    print(a["slug"], len(rows), "->", len(keep), file=sys.stderr)
    time.sleep(5)
json.dump(out, open("data/pois.json","w"), indent=1, ensure_ascii=False)
