/**
 * One-off tool: converts the original frontend demo dataset into server seed data.
 * Adds real geographic coordinates for the demo cities and preserves every complaint.
 *
 * Run with: npx tsx scripts/export-seed.ts
 */
import { build } from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CITIES: Record<string, { lat: number; lng: number }> = {
  Riverton: { lat: 17.4, lng: 78.47 },
  "Metro Heights": { lat: 17.47, lng: 78.38 },
  "Bay City": { lat: 17.34, lng: 78.56 },
};

async function main() {
  const outfile = path.join(os.tmpdir(), `nagarmitra-seed-${Date.now()}.mjs`);
  await build({
    entryPoints: ["src/data/complaints.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    alias: { "@": path.resolve("src") },
    logLevel: "silent",
  });

  const mod = (await import(pathToFileURL(outfile).href)) as {
    COMPLAINTS: Array<Record<string, any>>;
  };

  const seed = mod.COMPLAINTS.map((complaint) => {
    const city = complaint.city ?? "Riverton";
    const base = CITIES[city] ?? CITIES.Riverton;
    const x = Number(complaint.coordinates?.x ?? 50);
    const y = Number(complaint.coordinates?.y ?? 50);
    const ward = /Ward\s+\d+/i.exec(String(complaint.location))?.[0] ?? undefined;
    return {
      id: complaint.id,
      title: complaint.title,
      description: complaint.description,
      aiSummary: complaint.aiSummary,
      category: complaint.category,
      status: complaint.status,
      factors: complaint.factors,
      location: complaint.location,
      area: complaint.area,
      ward,
      city,
      date: complaint.date,
      photo: complaint.photo,
      lat: Number((base.lat + ((50 - y) / 100) * 0.07).toFixed(6)),
      lng: Number((base.lng + ((x - 50) / 100) * 0.1).toFixed(6)),
      upvotes: complaint.upvotes,
      why: complaint.why,
      resolutionNote: complaint.resolutionNote,
    };
  });

  const target = path.join("server", "src", "data", "seed-complaints.json");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(seed, null, 2));
  fs.unlinkSync(outfile);
  console.log(`Wrote ${seed.length} complaints to ${target}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
