import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const digest = value => createHash("sha256").update(value).digest("hex");
const manifest = readFileSync(resolve(root, "config/social-previews.json"));
// A deliberate artwork/copy change requires explicitly updating this approval lock.
if (digest(manifest) !== "07b7171b85c1cfbab294e77882341a9bec249a62b487e8b868549f4198c025cd") throw new Error("Approved sharing copy changed. Restore it or obtain the owner's explicit change request.");
const cards = JSON.parse(manifest.toString());
for (const [name, card] of Object.entries(cards)) {
  const bytes = readFileSync(resolve(root, `public${card.image}`));
  if (bytes.length < 1024 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || digest(bytes) !== card.sha256) {
    throw new Error(`${name}: approved sharing image is missing, empty or changed.`);
  }
  for (const legacy of card.legacyImages) {
    if (!existsSync(resolve(root, `public${legacy}`))) throw new Error(`${name}: keep previously shared image URL ${legacy}.`);
  }
}
const layout = readFileSync(resolve(root, "app/layout.tsx"), "utf8");
if (!layout.includes("socialMetadata(")) throw new Error("Root metadata must use the approved sharing manifest.");
const page = readFileSync(resolve(root, "app/page.tsx"), "utf8");
if (/export\s+const\s+metadata/.test(page) && !page.includes("socialMetadata(")) throw new Error("Home metadata must use the approved sharing manifest.");
const config = readFileSync(resolve(root, "next.config.ts"), "utf8");
if (!config.includes("htmlLimitedBots: /.*/")) throw new Error("Sharing metadata must be in the initial HTML for Kakao and message preview crawlers.");
console.log(`Verified approved sharing copy and images: ${Object.keys(cards).join(", ")}`);
