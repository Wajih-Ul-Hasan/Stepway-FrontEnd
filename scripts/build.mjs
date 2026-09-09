import { cpSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const raw = process.env.STEPWAY_API_BASE_URL;
if (!raw) throw new Error("Set STEPWAY_API_BASE_URL to your backend HTTPS origin.");
const url = new URL(raw);
if (url.protocol !== "https:" || url.username || url.password ||
    url.pathname !== "/" || url.search || url.hash ||
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("STEPWAY_API_BASE_URL must be a public HTTPS origin without a path, query or credentials.");
}
const out = path.join(root, "public");
mkdirSync(out, { recursive: true });
for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && /\.(html|css)$/.test(entry.name)) {
        cpSync(path.join(root, entry.name), path.join(out, entry.name));
    }
}
for (const dir of ["css", "CSS-First", "fonts", "images", "img", "js", "js-First", "vendor", "webfonts"]) {
    cpSync(path.join(root, dir), path.join(out, dir), { recursive: true });
}
writeFileSync(path.join(out, "js/config.js"),
    "window.STEPWAY_API_BASE_URL = " + JSON.stringify(url.origin) + ";\n");
console.log("Static site ready in public/; API: " + url.origin);
