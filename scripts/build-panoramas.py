"""Builds the 360-degree room panoramas used by the tour viewer.

Sources are Poly Haven indoor HDRIs (CC0, using Poly Haven's tonemapped JPGs) and equirectangular
interiors from Wikimedia Commons (public domain, CC BY or CC BY-SA, credited on /licences). For each we write a 4096x2048 WebP, a 1024x512 low-resolution WebP for the
first paint, and listing stills (rectilinear crops). Results: public/panos, public/stills,
data/panoramas.json.

Usage: python3 scripts/build-panoramas.py   (RAW_DIR caches the downloads, default .cache/panos)
"""
import json, os, re, urllib.parse, urllib.request
from datetime import datetime, timezone
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
UA = {"User-Agent": "Housio-asset-pipeline/1.0 (https://github.com/teddyjeremy/housio)"}
RAW = os.environ.get("RAW_DIR", ".cache/panos")

# Every panorama is used by exactly one listing, and each label was checked against the image.
# Poly Haven ids map to (room kind, still yaw). Wikimedia Commons entries carry their file title.
POLYHAVEN = {
    "cayley_interior": ("living", 240), "lythwood_lounge": ("living", 60), "reading_room": ("living", 60),
    "combination_room": ("living", 300), "anniversary_lounge": ("living", 120), "brown_photostudio_02": ("living", 225),
    "brown_photostudio_04": ("studio", 120), "kiara_interior": ("kitchen", 180), "studio_country_hall": ("dining", 0),
    "hotel_room": ("bedroom", 120), "relax_inn_seaview_suite": ("bedroom", 60), "lythwood_room": ("bedroom", 180),
    "glasshouse_interior": ("bedroom", 240), "en_suite": ("bathroom", 180), "modern_bathroom": ("bathroom", 0), "bathroom": ("bathroom", 300),
}
COMMONS = {
    "wm_bathroom_dass": ("File:Bathroom (28613007553).jpg", "bathroom", 0),
    "wm_motel_one_bathroom": ("File:Motel One Wien Hauptbahnhof - Badezimmer.jpg", "bathroom", 0),
    "wm_sandburg_kitchen": ("File:360 view of the Sandburg Home Kitchen (d0da8053-8da5-4c70-8e49-281c084900ec).jpg", "kitchen", 0),
    "wm_aura_kitchen": ("File:AURA Recinto Kitchen 360 Panorama (2022 04 13 Pano360 Recinto Building C Kitchen-CC).jpg", "kitchen", 0),
    "wm_eso_guesthouse_kitchen": ("File:ESO Guesthouse (gh-kitchen-pano).jpg", "kitchen", 0),
    "wm_sandburg_bedroom": ("File:360 view of Mrs. Sandburg's Bedroom (2a47eada-2d4c-4c54-8bce-8fe81c56e617).jpg", "bedroom", 0),
    "wm_residencia_room": ("File:La Residencia (residencia-room-pano).jpg", "bedroom", 0),
    "wm_pachon_hotel_room": ("File:Cerro Pachón Hotel Inside Panorama (2022 04 06 Pano360 Room Pachon Hotel2-CC).jpg", "studio", 0),
    "wm_tololo_hotel_room": ("File:Cerro Tololo Hotel Interior 360 Panorama (2022 04 08 Pano360 Tololo Hotel Room-CC).jpg", "bedroom", 0),
    "wm_eso_guesthouse_living": ("File:Guesthouse living room (gh-livingroom-pan).jpg", "living", 0),
    "wm_sandburg_living": ("File:Sandburg Home Living Room (b7a0ca83-a5e6-41b5-bc4b-bd2f97ae97a2).jpg", "living", 0),
    "wm_eso_guesthouse_dining": ("File:ESO Guesthouse (gh-dining-room-pano).jpg", "dining", 0),
    "wm_eso_suite_lounge": ("File:ESO Guesthouse (gh-direct-suite-pan).jpg", "living", 0),
    "wm_pachon_dormitory_room": ("File:Cerro Pachón Dormitory Room 360 Panorama (Pano360 Room Pachon Hotel1-CC).jpg", "bedroom", 0),
}
PANOS = {**POLYHAVEN, **{k: (v[1], v[2]) for k, v in COMMONS.items()}}

# Listing -> ordered rooms (label, panorama id). No panorama appears twice.
TOURS = {
    "westlands-parkside-residences": [("Living room", "wm_eso_suite_lounge"), ("Bedroom", "wm_tololo_hotel_room"), ("Bathroom", "wm_motel_one_bathroom")],
    "kilimani-arboretum-studio": [("Studio", "brown_photostudio_04"), ("Bathroom", "en_suite")],
    "kilimani-family-apartment": [("Living room", "wm_eso_guesthouse_living"), ("Kitchen and lounge", "kiara_interior"), ("Main bedroom", "hotel_room"), ("Bathroom", "modern_bathroom")],
    "karen-garden-cottage": [("Lounge", "lythwood_lounge"), ("Dining room", "studio_country_hall"), ("Bedroom", "lythwood_room"), ("Bathroom", "bathroom")],
    "kitisuru-ridge-suite": [("Living room", "reading_room"), ("Garden-view bedroom", "glasshouse_interior")],
    "kitisuru-extended-stay-house": [("Dining room", "wm_eso_guesthouse_dining"), ("Kitchen", "wm_eso_guesthouse_kitchen"), ("Bedroom", "wm_pachon_dormitory_room")],
    "south-b-business-studio": [("Studio", "wm_pachon_hotel_room"), ("Bathroom", "wm_bathroom_dass")],
    "langata-forest-edge-apartment": [("Open-plan living space", "brown_photostudio_02"), ("Kitchen", "wm_aura_kitchen"), ("Bedroom", "relax_inn_seaview_suite")],
    "gigiri-diplomatic-serviced-apartment": [("Lounge", "anniversary_lounge"), ("Living and dining room", "cayley_interior"), ("Bedroom", "wm_residencia_room")],
    "runda-quiet-villa": [("Drawing room", "combination_room"), ("Family room", "wm_sandburg_living"), ("Kitchen", "wm_sandburg_kitchen"), ("Twin bedroom", "wm_sandburg_bedroom")],
}

LICENCES = {"CC BY 2.0": "CC-BY-2.0", "CC BY 4.0": "CC-BY-4.0", "CC BY-SA 4.0": "CC-BY-SA-4.0", "Public domain": "Public domain", "CC0": "CC0-1.0"}


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read()


def still(eq, yaw_deg, pitch_deg=-5, fov_deg=80, w=1600, h=1000):
    """Rectilinear view from an equirectangular image."""
    H, W = eq.shape[:2]
    f = (w / 2) / np.tan(np.radians(fov_deg) / 2)
    x, y = np.meshgrid(np.arange(w) - w / 2, np.arange(h) - h / 2)
    d = np.stack([x, -y, np.full_like(x, f, dtype=float)], -1)
    d /= np.linalg.norm(d, axis=-1, keepdims=True)
    p, yw = np.radians(pitch_deg), np.radians(yaw_deg)
    ry, rz = d[..., 1] * np.cos(p) + d[..., 2] * np.sin(p), -d[..., 1] * np.sin(p) + d[..., 2] * np.cos(p)
    rx = d[..., 0] * np.cos(yw) + rz * np.sin(yw)
    rz = -d[..., 0] * np.sin(yw) + rz * np.cos(yw)
    lon, lat = np.arctan2(rx, rz), np.arcsin(np.clip(ry, -1, 1))
    u = ((lon / (2 * np.pi) + 0.5) * W).astype(int) % W
    v = np.clip(((0.5 - lat / np.pi) * H).astype(int), 0, H - 1)
    return Image.fromarray(eq[v, u])


def main():
    os.makedirs(RAW, exist_ok=True)
    os.makedirs("public/panos", exist_ok=True)
    os.makedirs("public/stills", exist_ok=True)
    panos = []
    arrays = {}
    for pid, (kind, yaw) in PANOS.items():
        raw = os.path.join(RAW, f"{pid}.jpg")
        if pid in POLYHAVEN:
            files = json.loads(get(f"https://api.polyhaven.com/files/{pid}"))
            info = json.loads(get(f"https://api.polyhaven.com/info/{pid}"))
            original = files["tonemapped"]["url"]
            meta = {"name": info["name"], "source": "Poly Haven", "page_url": f"https://polyhaven.com/a/{pid}", "creator": ", ".join(info["authors"].keys()),
                    "licence": "CC0-1.0", "licence_url": "https://polyhaven.com/license", "attribution_required": False}
        else:
            title = COMMONS[pid][0]
            q = urllib.parse.urlencode({"action": "query", "titles": title, "prop": "imageinfo", "iiprop": "url|extmetadata", "iiurlwidth": 4096, "format": "json"})
            page = next(iter(json.loads(get(f"https://commons.wikimedia.org/w/api.php?{q}"))["query"]["pages"].values()))
            ii = page["imageinfo"][0]
            m = ii["extmetadata"]
            original = ii["thumburl"]
            lic = m["LicenseShortName"]["value"]
            meta = {"name": title[5:].rsplit(".", 1)[0], "source": "Wikimedia Commons", "page_url": ii["descriptionurl"],
                    "creator": re.sub(r"<[^>]+>", "", m.get("Artist", {}).get("value", "")).replace("©", "").strip(),
                    "licence": LICENCES.get(lic, lic), "licence_url": m.get("LicenseUrl", {}).get("value", ii["descriptionurl"]),
                    "attribution_required": lic != "Public domain"}
        if not os.path.exists(raw):
            open(raw, "wb").write(get(original))
        im = Image.open(raw).convert("RGB")
        full = im.resize((4096, 2048), Image.LANCZOS)
        full.save(f"public/panos/{pid}.webp", quality=76, method=5)
        im.resize((1024, 512), Image.LANCZOS).save(f"public/panos/{pid}-low.webp", quality=60)
        arrays[pid] = np.asarray(full)
        panos.append({
            "id": pid, "kind": kind, "yaw": yaw, **meta,
            "file": f"/panos/{pid}.webp", "low": f"/panos/{pid}-low.webp",
            "bytes": os.path.getsize(f"public/panos/{pid}.webp"), "low_bytes": os.path.getsize(f"public/panos/{pid}-low.webp"),
            "original": original,
        })
        print("pano", pid)
    stills = {}
    for slug, rooms in TOURS.items():
        stills[slug] = []
        for i, (label, pid) in enumerate(rooms[:3]):
            assert sum(pid == r for t in TOURS.values() for _, r in t) == 1, pid
            out = f"/stills/{slug}-{i + 1}.jpg"
            still(arrays[pid], PANOS[pid][1]).save(f"public{out}", quality=82, optimize=True, progressive=True)
            stills[slug].append({"file": out, "room": label, "panorama": pid})
    json.dump({
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "panoramas": panos,
        "tours": {slug: [{"room": label, "panorama": pid} for label, pid in rooms] for slug, rooms in TOURS.items()},
        "stills": stills,
    }, open("data/panoramas.json", "w"), indent=1)


if __name__ == "__main__":
    main()
