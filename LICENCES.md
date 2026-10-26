# Data and asset licences

## Room panoramas and photos

Room panoramas are Poly Haven indoor HDRIs, published under CC0 1.0 (public domain). We use Poly Haven's own
tonemapped JPG of each one, resized by `scripts/build-panoramas.py` to a 4096×2048 WebP plus a 1024×512 preview that
loads first. Listing photos in `public/stills` are flat views cropped from the same panoramas. Attribution is not
required but is given here and on the site's Credits page (`/licences`). The full record is in `data/panoramas.json`.

| ID | Name | Room | Source | Photographer | Licence |
|---|---|---|---|---|---|
| cayley_interior | Cayley Interior | living | [Poly Haven](https://polyhaven.com/a/cayley_interior) | Greg Zaal | CC0-1.0 |
| lythwood_lounge | Lythwood Lounge | living | [Poly Haven](https://polyhaven.com/a/lythwood_lounge) | Greg Zaal | CC0-1.0 |
| reading_room | Reading Room | living | [Poly Haven](https://polyhaven.com/a/reading_room) | Greg Zaal | CC0-1.0 |
| combination_room | Combination Room | living | [Poly Haven](https://polyhaven.com/a/combination_room) | Sergej Majboroda | CC0-1.0 |
| wooden_lounge | Wooden Lounge | living | [Poly Haven](https://polyhaven.com/a/wooden_lounge) | Greg Zaal | CC0-1.0 |
| anniversary_lounge | Anniversary Lounge | living | [Poly Haven](https://polyhaven.com/a/anniversary_lounge) | Greg Zaal | CC0-1.0 |
| brown_photostudio_04 | Brown Photostudio 04 | studio | [Poly Haven](https://polyhaven.com/a/brown_photostudio_04) | Sergej Majboroda | CC0-1.0 |
| kiara_interior | Kiara Interior | kitchen | [Poly Haven](https://polyhaven.com/a/kiara_interior) | Greg Zaal | CC0-1.0 |
| studio_country_hall | Studio Country Hall | kitchen | [Poly Haven](https://polyhaven.com/a/studio_country_hall) | Sergej Majboroda | CC0-1.0 |
| hotel_room | Hotel Room | bedroom | [Poly Haven](https://polyhaven.com/a/hotel_room) | Greg Zaal | CC0-1.0 |
| relax_inn_seaview_suite | Relax Inn Seaview Suite | bedroom | [Poly Haven](https://polyhaven.com/a/relax_inn_seaview_suite) | Dario Barresi, Jenelle van Heerden | CC0-1.0 |
| lythwood_room | Lythwood Room | bedroom | [Poly Haven](https://polyhaven.com/a/lythwood_room) | Greg Zaal | CC0-1.0 |
| glasshouse_interior | Glasshouse Interior | bedroom | [Poly Haven](https://polyhaven.com/a/glasshouse_interior) | Dario Barresi | CC0-1.0 |
| en_suite | En Suite | bathroom | [Poly Haven](https://polyhaven.com/a/en_suite) | Greg Zaal | CC0-1.0 |
| modern_bathroom | Modern Bathroom | bathroom | [Poly Haven](https://polyhaven.com/a/modern_bathroom) | Adrian Kubasa | CC0-1.0 |
| bathroom | Bathroom | bathroom | [Poly Haven](https://polyhaven.com/a/bathroom) | Greg Zaal | CC0-1.0 |

## Nearby places

Nearby places come from OpenStreetMap, © OpenStreetMap contributors, available under the
[Open Database Licence (ODbL) 1.0](https://www.openstreetmap.org/copyright). They were extracted from the
Geofabrik Kenya extract (`scripts/extract-pois-pbf.py`) within 2.5 km of each listing's representative point.
Distances are straight-line (haversine), not travel distances. Each record links to its OSM object.

| Listing | Places kept | Raw matches within 2.5 km |
|---|---|---|
| westlands-parkside-residences | 36 | 536 |
| kilimani-arboretum-studio | 36 | 661 |
| kilimani-family-apartment | 36 | 1112 |
| karen-garden-cottage | 28 | 113 |
| kitisuru-ridge-suite | 31 | 106 |
| kitisuru-extended-stay-house | 25 | 70 |
| south-b-business-studio | 33 | 308 |
| langata-forest-edge-apartment | 24 | 80 |
| gigiri-diplomatic-serviced-apartment | 29 | 179 |
| runda-quiet-villa | 31 | 140 |

## Maps

Map tiles: [OpenFreeMap](https://openfreemap.org) (Positron style), data © OpenStreetMap contributors.

## Fonts

Manrope and Inter, both under the SIL Open Font License 1.1, served through `next/font`.
