import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../server/src/app.js";
import { seedDatabase } from "../server/src/seed.js";

let ready = false;
let app: any = null;

function getApp() {
  if (!ready) {
    try {
      seedDatabase();
    } catch (e) {
      console.warn("[api] Seed initialization:", e);
    }
    app = createApp();
    ready = true;
  }
  return app;
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return getApp()(req, res);
}
