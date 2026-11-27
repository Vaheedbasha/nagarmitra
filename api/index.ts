import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../server/src/app.js";
import { seedDatabase } from "../server/src/seed.js";
import { initCloudStorage, syncCloudDatabase } from "../server/src/cloud-storage.js";

let ready = false;
let initPromise: Promise<any> | null = null;
let app: any = null;

async function setup() {
  try {
    const restored = await initCloudStorage();
    const seedResult = seedDatabase();
    if (seedResult.seeded && !restored) {
      await syncCloudDatabase();
    }
  } catch (e) {
    console.warn("[api] Initialization check:", e);
  }
  app = createApp();
  ready = true;
  return app;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!ready) {
    if (!initPromise) {
      initPromise = setup();
    }
    await initPromise;
  }
  return app(req, res);
}
