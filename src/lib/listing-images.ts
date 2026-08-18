import fs from "fs";
import path from "path";

export function getListingImages(): string[] {
  const dir = path.join(process.cwd(), "public", "listing");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort()
    .map((f) => `/listing/${f}`);
}
