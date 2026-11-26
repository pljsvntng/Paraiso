// Static-export image delivery: preserve uploads and generate only smaller copies.
// Uses Sharp already installed by Next.js; no additional runtime dependency.
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";

const catalog = {
  ...JSON.parse(await readFile("src/data/photo-catalog.json", "utf8")),
  ...JSON.parse(await readFile("src/data/accommodation-photo-catalog.json", "utf8")),
};
await mkdir("public/images/optimized", { recursive: true });
const variants = {};
for (const [id, photo] of Object.entries(catalog)) {
  const source = photo.delivery || photo.src;
  const file = `public${source}`;
  const bytes = await readFile(file);
  const metadata = await sharp(bytes).metadata();
  const width = metadata.autoOrient.width;
  const height = metadata.autoOrient.height;
  // Content-addressed URLs stay safe with long-lived CDN caches after replacement.
  const hash = createHash("sha256").update(bytes).update("webp-q82-v1").digest("hex").slice(0, 12);
  const candidates = [];
  const max = Math.min(width, id === "hero" ? 1920 : 1600);
  const needsDeliveryCopy = !source.endsWith(".webp") || bytes.length > 700_000;
  // Small gallery thumbnails should not fetch the 480px card photograph.
  const widths = [...new Set([160, 480, 960, ...(needsDeliveryCopy ? [max] : [])])].filter(w => w <= max);
  for (const size of widths) {
    const url = `/images/optimized/${id}-${hash}-${size}.webp`;
    const target = `public${url}`;
    if (!(await stat(target).catch(() => null))) {
      await sharp(bytes).rotate().resize({ width: size, withoutEnlargement: true })
        .webp({ quality: 82, effort: 5 }).toFile(target);
    }
    candidates.push({ src: url, width: size });
  }
  if (!needsDeliveryCopy) candidates.push({ src: source, width });
  const src = candidates.at(-1).src;
  variants[photo.src] = { src, width, height, srcSet: candidates.map(c => `${c.src} ${c.width}w`).join(", ") };
  if (id === "hero") {
    // A tall delivery crop avoids downloading an entire wide frame on phones.
    const cropWidth = Math.round(height * 0.6);
    const crop = { left: Math.round((width - cropWidth) * 0.48), top: 0, width: cropWidth, height };
    const mobile = [];
    for (const size of [480, cropWidth]) {
      const url = `/images/optimized/${id}-mobile-${hash}-${size}.webp`;
      if (!(await stat(`public${url}`).catch(() => null))) {
        await sharp(bytes).rotate().extract(crop).resize({ width: size, withoutEnlargement: true })
          .webp({ quality: 82, effort: 5 }).toFile(`public${url}`);
      }
      mobile.push({ src: url, width: size });
    }
    variants[photo.src].mobile = { src: mobile.at(-1).src,
      srcSet: mobile.map(c => `${c.src} ${c.width}w`).join(", "), width: cropWidth, height };
  }
}
await writeFile("src/data/image-variants.json", JSON.stringify(variants, null, 2) + "\n");
console.log(`Prepared responsive delivery for ${Object.keys(variants).length} photographs; originals preserved.`);
