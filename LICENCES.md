# Data and asset licences

## Room panoramas and photos

Each room panorama is used by exactly one listing. Sources: Poly Haven indoor HDRIs (CC0, Poly Haven's tonemapped JPGs)
and equirectangular interiors from Wikimedia Commons (public domain, CC BY 2.0, CC BY 4.0 or CC BY-SA 4.0).
`scripts/build-panoramas.py` resizes each to a 4096×2048 WebP plus a 1024×512 preview, and crops listing photos in
`public/stills` from the same images. These are modified (resized and cropped) versions. Images derived from CC BY-SA
works are shared under CC BY-SA 4.0. The full record is in `data/panoramas.json` and on the site's Credits page (`/licences`).

| ID | Name | Room | Source | Photographer | Licence |
|---|---|---|---|---|---|
| cayley_interior | Cayley Interior | living | [Poly Haven](https://polyhaven.com/a/cayley_interior) | Greg Zaal | CC0-1.0 |
| lythwood_lounge | Lythwood Lounge | living | [Poly Haven](https://polyhaven.com/a/lythwood_lounge) | Greg Zaal | CC0-1.0 |
| reading_room | Reading Room | living | [Poly Haven](https://polyhaven.com/a/reading_room) | Greg Zaal | CC0-1.0 |
| combination_room | Combination Room | living | [Poly Haven](https://polyhaven.com/a/combination_room) | Sergej Majboroda | CC0-1.0 |
| anniversary_lounge | Anniversary Lounge | living | [Poly Haven](https://polyhaven.com/a/anniversary_lounge) | Greg Zaal | CC0-1.0 |
| brown_photostudio_02 | Brown Photostudio 02 | living | [Poly Haven](https://polyhaven.com/a/brown_photostudio_02) | Sergej Majboroda | CC0-1.0 |
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
| wm_bathroom_dass | Bathroom (28613007553) | bathroom | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Bathroom_(28613007553).jpg) | Bob Dass | CC-BY-2.0 |
| wm_motel_one_bathroom | Motel One Wien Hauptbahnhof - Badezimmer | bathroom | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Motel_One_Wien_Hauptbahnhof_-_Badezimmer.jpg) | 1971markus | CC-BY-SA-4.0 |
| wm_sandburg_kitchen | 360 view of the Sandburg Home Kitchen (d0da8053-8da5-4c70-8e49-281c084900ec) | kitchen | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:360_view_of_the_Sandburg_Home_Kitchen_(d0da8053-8da5-4c70-8e49-281c084900ec).jpg) | NPS Photo | Public domain |
| wm_aura_kitchen | AURA Recinto Kitchen 360 Panorama (2022 04 13 Pano360 Recinto Building C Kitchen-CC) | kitchen | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:AURA_Recinto_Kitchen_360_Panorama_(2022_04_13_Pano360_Recinto_Building_C_Kitchen-CC).jpg) | NOIRLab/NSF/AURA/P. Horálek | CC-BY-4.0 |
| wm_eso_guesthouse_kitchen | ESO Guesthouse (gh-kitchen-pano) | kitchen | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:ESO_Guesthouse_(gh-kitchen-pano).jpg) | ESO | CC-BY-4.0 |
| wm_sandburg_bedroom | 360 view of Mrs. Sandburg's Bedroom (2a47eada-2d4c-4c54-8bce-8fe81c56e617) | bedroom | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:360_view_of_Mrs._Sandburg%27s_Bedroom_(2a47eada-2d4c-4c54-8bce-8fe81c56e617).jpg) | NPS Photo | Public domain |
| wm_residencia_room | La Residencia (residencia-room-pano) | bedroom | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:La_Residencia_(residencia-room-pano).jpg) | ESO | CC-BY-4.0 |
| wm_pachon_hotel_room | Cerro Pachón Hotel Inside Panorama (2022 04 06 Pano360 Room Pachon Hotel2-CC) | studio | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Cerro_Pach%C3%B3n_Hotel_Inside_Panorama_(2022_04_06_Pano360_Room_Pachon_Hotel2-CC).jpg) | NOIRLab/AURA/NSF/P. Horálek | CC-BY-4.0 |
| wm_tololo_hotel_room | Cerro Tololo Hotel Interior 360 Panorama (2022 04 08 Pano360 Tololo Hotel Room-CC) | bedroom | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Cerro_Tololo_Hotel_Interior_360_Panorama_(2022_04_08_Pano360_Tololo_Hotel_Room-CC).jpg) | NOIRLab/NSF/AURA/P. Horálek | CC-BY-4.0 |
| wm_eso_guesthouse_living | Guesthouse living room (gh-livingroom-pan) | living | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Guesthouse_living_room_(gh-livingroom-pan).jpg) | ESO | CC-BY-4.0 |
| wm_sandburg_living | Sandburg Home Living Room (b7a0ca83-a5e6-41b5-bc4b-bd2f97ae97a2) | living | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Sandburg_Home_Living_Room_(b7a0ca83-a5e6-41b5-bc4b-bd2f97ae97a2).jpg) | NPS Photo | Public domain |
| wm_eso_guesthouse_dining | ESO Guesthouse (gh-dining-room-pano) | dining | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:ESO_Guesthouse_(gh-dining-room-pano).jpg) | ESO | CC-BY-4.0 |
| wm_eso_suite_lounge | ESO Guesthouse (gh-direct-suite-pan) | living | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:ESO_Guesthouse_(gh-direct-suite-pan).jpg) | ESO | CC-BY-4.0 |
| wm_pachon_dormitory_room | Cerro Pachón Dormitory Room 360 Panorama (Pano360 Room Pachon Hotel1-CC) | bedroom | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Cerro_Pach%C3%B3n_Dormitory_Room_360_Panorama_(Pano360_Room_Pachon_Hotel1-CC).jpg) | CTIO/NOIRLab/NSF/AURA/P. Horálek | CC-BY-4.0 |

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
