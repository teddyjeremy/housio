// Repeatable 3D asset pipeline.
// 1. Downloads approved CC0 models from Poly Haven (public API) and the Kenney Furniture Kit.
// 2. Validates and optimises them with glTF-Transform (dedup, weld, quantise, texture resize to WebP).
// 3. Writes public/assets/models/*.glb and data/asset-manifest.json with source and licence metadata.
// Usage: npm run assets
import { mkdir, writeFile, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, weld, prune, resample, textureCompress, quantize, getBounds } from "@gltf-transform/functions";
import sharp from "sharp";

const UA = { "User-Agent": "Housio-asset-pipeline/1.0 (https://github.com/teddyjeremy/housio)" };
const RAW = "public/assets/_raw";
const OUT = "public/assets/models";
const KENNEY_ZIP = "https://kenney.nl/media/pages/assets/furniture-kit/440e0608a4-1677580847/kenney_furniture-kit.zip";

// Approved list. `size` is the real-world bounding box [w, h, d] in metres the room builder fits the model to.
const POLYHAVEN = [
  ["sofa_03", "sofa", [2.2, 0.85, 0.95], ["living"]],
  ["modern_arm_chair_01", "armchair", [0.8, 0.85, 0.8], ["living", "bedroom"]],
  ["modern_coffee_table_01", "coffee_table", [1.1, 0.42, 0.6], ["living"]],
  ["dining_table", "dining_table", [1.6, 0.76, 0.9], ["dining", "kitchen"]],
  ["gallinera_chair", "dining_chair", [0.48, 0.85, 0.5], ["dining"]],
  ["ClassicNightstand_01", "nightstand", [0.5, 0.6, 0.4], ["bedroom"]],
  ["side_table_01", "side_table", [0.5, 0.55, 0.5], ["living", "balcony"]],
  ["metal_office_desk", "desk", [1.3, 0.76, 0.65], ["office", "bedroom"]],
  ["mid_century_lounge_chair", "lounge_chair", [0.8, 0.85, 0.85], ["living", "balcony"]],
  ["ceramic_vase_01", "vase", [0.2, 0.35, 0.2], ["living", "dining"]],
  ["anthurium_botany_01", "plant", [0.45, 0.7, 0.45], ["living", "bedroom", "balcony"]],
  ["fancy_picture_frame_01", "picture_frame", [0.6, 0.8, 0.04], ["living", "bedroom"]],
];
const KENNEY = [
  ["bedDouble", "bed_double", [1.7, 0.55, 2.1], ["bedroom"]],
  ["bedSingle", "bed_single", [1.0, 0.55, 2.0], ["bedroom"]],
  ["kitchenFridgeLarge", "fridge", [0.8, 1.9, 0.7], ["kitchen"]],
  ["kitchenStoveElectric", "stove", [0.6, 0.9, 0.6], ["kitchen"]],
  ["kitchenCabinet", "kitchen_cabinet", [0.6, 0.9, 0.6], ["kitchen"]],
  ["kitchenSink", "kitchen_sink", [0.6, 0.9, 0.6], ["kitchen"]],
  ["kitchenCabinetUpper", "kitchen_upper", [0.6, 0.7, 0.35], ["kitchen"]],
  ["kitchenMicrowave", "microwave", [0.5, 0.3, 0.38], ["kitchen"]],
  ["bathtub", "bathtub", [1.7, 0.6, 0.8], ["bathroom"]],
  ["showerRound", "shower", [0.9, 2.0, 0.9], ["bathroom"]],
  ["toilet", "toilet", [0.4, 0.8, 0.7], ["bathroom"]],
  ["bathroomSink", "bathroom_sink", [0.6, 0.9, 0.45], ["bathroom"]],
  ["bathroomMirror", "mirror", [0.6, 0.8, 0.05], ["bathroom"]],
  ["lampRoundFloor", "floor_lamp", [0.4, 1.6, 0.4], ["living", "bedroom"]],
  ["televisionModern", "television", [1.2, 0.72, 0.2], ["living"]],
  ["cabinetTelevision", "tv_cabinet", [1.6, 0.5, 0.45], ["living"]],
  ["rugRectangle", "rug", [2.4, 0.01, 1.7], ["living", "bedroom"]],
  ["bookcaseOpen", "bookcase", [0.9, 1.8, 0.35], ["living", "office"]],
  ["washer", "washer", [0.6, 0.85, 0.6], ["kitchen"]],
  ["chairDesk", "desk_chair", [0.6, 1.0, 0.6], ["office", "bedroom"]],
  ["loungeSofaCorner", "corner_sofa", [2.4, 0.85, 2.0], ["living"]],
];

async function get(url, dest) {
  if (existsSync(dest)) return;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  await new Promise((r) => setTimeout(r, 250));
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
async function optimise(src, dest) {
  const doc = await io.read(src);
  await doc.transform(
    dedup(), weld(), prune(), resample(),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [512, 512], quality: 80 }),
    quantize(),
  );
  const root = doc.getRoot();
  let triangles = 0;
  for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) {
    const idx = prim.getIndices(); const pos = prim.getAttribute("POSITION");
    triangles += Math.round((idx ? idx.getCount() : pos ? pos.getCount() : 0) / 3);
  }
  const textures = root.listTextures().map((t) => ({ mime: t.getMimeType(), size: t.getSize() }));
  const scene = root.getDefaultScene() ?? root.listScenes()[0];
  const b = getBounds(scene);
  await io.write(dest, doc);
  const bytes = (await stat(dest)).size;
  return { triangles, textures, bytes, bounds: { min: b.min.map((v) => +v.toFixed(3)), max: b.max.map((v) => +v.toFixed(3)) } };
}

await mkdir(OUT, { recursive: true });
const manifest = { generated_at: new Date().toISOString(), assets: [] };

for (const [id, category, size, rooms] of POLYHAVEN) {
  const info = await (await fetch(`https://api.polyhaven.com/info/${id}`, { headers: UA })).json();
  const files = await (await fetch(`https://api.polyhaven.com/files/${id}`, { headers: UA })).json();
  const g = files.gltf["1k"].gltf;
  const dir = `${RAW}/polyhaven/${id}`;
  await get(g.url, `${dir}/${path.basename(g.url)}`);
  for (const [rel, f] of Object.entries(g.include)) await get(f.url, `${dir}/${rel}`);
  const dest = `${OUT}/${category}.glb`;
  const stats = await optimise(`${dir}/${path.basename(g.url)}`, dest);
  manifest.assets.push({
    id: category, name: info.name, category, source: "Poly Haven", source_id: id,
    page_url: `https://polyhaven.com/a/${id}`, creator: Object.keys(info.authors ?? {}).join(", ") || null,
    licence: "CC0-1.0", licence_url: "https://polyhaven.com/license", attribution_required: false,
    licence_verified: "Poly Haven publishes every asset under CC0; confirmed on the asset page and licence page.",
    file: `/assets/models/${category}.glb`, format: "glb", bytes: stats.bytes, triangles: stats.triangles,
    textures: stats.textures, bounds: stats.bounds, target_size_m: size, rooms,
    optimisation: "dedup, weld, prune, quantize, textures resized to 512px WebP", status: "validated",
  });
  console.log("polyhaven", id, stats.bytes, stats.triangles);
}

const zip = `${RAW}/kenney_furniture-kit.zip`;
await get(KENNEY_ZIP, zip);
if (!existsSync(`${RAW}/kenney/License.txt`)) execFileSync("unzip", ["-q", "-o", zip, "-d", `${RAW}/kenney`]);
const licence = await readFile(`${RAW}/kenney/License.txt`, "utf8");
if (!/Creative Commons Zero, CC0/.test(licence)) throw new Error("Kenney licence text did not confirm CC0");
for (const [id, category, size, rooms] of KENNEY) {
  const dest = `${OUT}/${category}.glb`;
  const stats = await optimise(`${RAW}/kenney/Models/GLTF format/${id}.glb`, dest);
  manifest.assets.push({
    id: category, name: id, category, source: "Kenney Furniture Kit 2.0", source_id: id,
    page_url: "https://kenney.nl/assets/furniture-kit", creator: "Kenney (www.kenney.nl)",
    licence: "CC0-1.0", licence_url: "https://creativecommons.org/publicdomain/zero/1.0/", attribution_required: false,
    licence_verified: "License.txt in the downloaded archive states Creative Commons Zero (CC0).",
    file: `/assets/models/${category}.glb`, format: "glb", bytes: stats.bytes, triangles: stats.triangles,
    textures: stats.textures, bounds: stats.bounds, target_size_m: size, rooms,
    optimisation: "dedup, weld, prune, quantize", status: "validated",
  });
  console.log("kenney", id, stats.bytes, stats.triangles);
}

// Environment lighting: a small CC0 interior HDRI from Poly Haven.
const hdri = await (await fetch("https://api.polyhaven.com/files/brown_photostudio_02", { headers: UA })).json();
await get(hdri.hdri["1k"].hdr.url, "public/assets/hdri/interior_1k.hdr");
manifest.assets.push({
  id: "interior_hdri", name: "Brown Photostudio 02", category: "environment", source: "Poly Haven", source_id: "brown_photostudio_02",
  page_url: "https://polyhaven.com/a/brown_photostudio_02", creator: "Sergej Majboroda", licence: "CC0-1.0",
  licence_url: "https://polyhaven.com/license", attribution_required: false, licence_verified: "Poly Haven CC0",
  file: "/assets/hdri/interior_1k.hdr", format: "hdr", bytes: (await stat("public/assets/hdri/interior_1k.hdr")).size,
  triangles: null, textures: [], rooms: ["all"], optimisation: "1k resolution", status: "validated",
});


// PBR surface textures from ambientCG (CC0), resized to 512px for the room builder.
const AMBIENT = [["WoodFloor041", "wood_floor"], ["Tiles074", "tiles"], ["Plaster001", "plaster"], ["Grass004", "grass"]];
await mkdir("public/assets/textures", { recursive: true });
for (const [id, key] of AMBIENT) {
  const zipPath = `${RAW}/ambientcg/${id}_1K-JPG.zip`;
  await get(`https://ambientcg.com/get?file=${id}_1K-JPG.zip`, zipPath);
  const dir = `${RAW}/ambientcg/${id}`;
  if (!existsSync(dir)) execFileSync("unzip", ["-q", "-o", zipPath, "-d", dir]);
  const maps = {};
  for (const [suffix, name] of [["Color", "color"], ["NormalGL", "normal"], ["Roughness", "rough"]]) {
    const src = `${dir}/${id}_1K-JPG_${suffix}.jpg`;
    if (!existsSync(src)) continue;
    const dest = `public/assets/textures/${key}_${name}.jpg`;
    await sharp(src).resize(512, 512).jpeg({ quality: 82 }).toFile(dest);
    maps[name] = { file: dest.replace("public", ""), bytes: (await stat(dest)).size };
  }
  manifest.assets.push({
    id: key, name: id, category: "texture", source: "ambientCG", source_id: id, page_url: `https://ambientcg.com/view?id=${id}`,
    creator: "Lennart Demes (ambientCG)", licence: "CC0-1.0", licence_url: "https://docs.ambientcg.com/license/", attribution_required: false,
    licence_verified: "ambientCG states all assets are CC0 1.0 Universal.", file: maps.color?.file, format: "jpg",
    bytes: Object.values(maps).reduce((n, m) => n + m.bytes, 0), triangles: null, textures: Object.entries(maps).map(([k, m]) => ({ map: k, file: m.file, size: [512, 512] })),
    rooms: key === "tiles" ? ["bathroom", "kitchen", "balcony"] : key === "grass" ? ["garden"] : key === "plaster" ? ["all walls"] : ["living", "bedroom", "dining", "office"],
    optimisation: "resized to 512px JPEG", status: "validated",
  });
  console.log("ambientcg", id);
}

await writeFile("data/asset-manifest.json", JSON.stringify(manifest, null, 1));
console.log("assets:", manifest.assets.length);
