"""Builds the 360-degree room panoramas used by the tour viewer.

Sources are Poly Haven indoor HDRIs (CC0). For each one we download Poly Haven's own
tonemapped JPG, then write a 4096x2048 WebP, a 1024x512 low-resolution WebP for the
first paint, and listing stills (rectilinear crops). Results: public/panos, public/stills,
data/panoramas.json.

Usage: python3 scripts/build-panoramas.py   (RAW_DIR caches the downloads, default .cache/panos)
"""
import json, os, urllib.request
from datetime import datetime, timezone
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
UA = {"User-Agent": "Housio-asset-pipeline/1.0 (https://github.com/teddyjeremy/housio)"}
RAW = os.environ.get("RAW_DIR", ".cache/panos")

# Panorama id -> (room kind, default view yaw in degrees, 0 = image centre)
PANOS = {
    "cayley_interior": ("living", 240), "lythwood_lounge": ("living", 60), "reading_room": ("living", 60),
    "combination_room": ("living", 300), "wooden_lounge": ("living", 0), "anniversary_lounge": ("living", 120),
    "brown_photostudio_04": ("studio", 120), "kiara_interior": ("kitchen", 180), "studio_country_hall": ("kitchen", 0),
    "hotel_room": ("bedroom", 120), "relax_inn_seaview_suite": ("bedroom", 60), "lythwood_room": ("bedroom", 180),
    "glasshouse_interior": ("bedroom", 240), "en_suite": ("bathroom", 180), "modern_bathroom": ("bathroom", 0), "bathroom": ("bathroom", 300),
}
# Listing -> ordered rooms (label, panorama id)
TOURS = {
    "westlands-parkside-residences": [("Living room", "cayley_interior"), ("Bedroom", "relax_inn_seaview_suite"), ("Bathroom", "en_suite")],
    "kilimani-arboretum-studio": [("Studio", "brown_photostudio_04"), ("Bathroom", "bathroom")],
    "kilimani-family-apartment": [("Living room", "wooden_lounge"), ("Kitchen", "kiara_interior"), ("Main bedroom", "hotel_room"), ("Bathroom", "modern_bathroom")],
    "karen-garden-cottage": [("Lounge", "lythwood_lounge"), ("Kitchen", "studio_country_hall"), ("Bedroom", "lythwood_room"), ("Bathroom", "bathroom")],
    "kitisuru-ridge-suite": [("Living room", "reading_room"), ("Bedroom", "glasshouse_interior"), ("Bathroom", "en_suite")],
    "kitisuru-extended-stay-house": [("Living room", "anniversary_lounge"), ("Kitchen", "studio_country_hall"), ("Bedroom", "glasshouse_interior"), ("Bathroom", "modern_bathroom")],
    "south-b-business-studio": [("Studio", "hotel_room"), ("Bathroom", "en_suite")],
    "langata-forest-edge-apartment": [("Living room", "wooden_lounge"), ("Bedroom", "relax_inn_seaview_suite"), ("Bathroom", "bathroom")],
    "gigiri-diplomatic-serviced-apartment": [("Lounge", "anniversary_lounge"), ("Bedroom", "hotel_room"), ("Bathroom", "modern_bathroom")],
    "runda-quiet-villa": [("Living room", "combination_room"), ("Kitchen", "kiara_interior"), ("Bedroom", "lythwood_room"), ("Bathroom", "en_suite")],
}


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
        files = json.loads(get(f"https://api.polyhaven.com/files/{pid}"))
        info = json.loads(get(f"https://api.polyhaven.com/info/{pid}"))
        if not os.path.exists(raw):
            open(raw, "wb").write(get(files["tonemapped"]["url"]))
        im = Image.open(raw).convert("RGB")
        im.resize((4096, 2048), Image.LANCZOS).save(f"public/panos/{pid}.webp", quality=76, method=5)
        low = im.resize((1024, 512), Image.LANCZOS)
        low.save(f"public/panos/{pid}-low.webp", quality=60)
        arrays[pid] = np.asarray(im.resize((4096, 2048), Image.LANCZOS))
        panos.append({
            "id": pid, "name": info["name"], "kind": kind, "yaw": yaw,
            "file": f"/panos/{pid}.webp", "low": f"/panos/{pid}-low.webp",
            "bytes": os.path.getsize(f"public/panos/{pid}.webp"), "low_bytes": os.path.getsize(f"public/panos/{pid}-low.webp"),
            "source": "Poly Haven", "page_url": f"https://polyhaven.com/a/{pid}", "creator": ", ".join(info["authors"].keys()),
            "licence": "CC0-1.0", "licence_url": "https://polyhaven.com/license", "attribution_required": False,
            "original": files["tonemapped"]["url"],
        })
        print("pano", pid)
    stills = {}
    for slug, rooms in TOURS.items():
        stills[slug] = []
        for i, (label, pid) in enumerate(rooms[:3]):
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
