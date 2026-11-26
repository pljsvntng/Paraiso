// Optional asset-maintenance command. Builds never contact Google Fonts.
import { mkdir, writeFile } from "node:fs/promises";
const directory = new URL("../../public/fonts/", import.meta.url);
await mkdir(directory, { recursive: true });
const response = await fetch(
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;1,400&family=Manrope:wght@400;500;600&display=swap",
  {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    },
  },
);
if (!response.ok)
  throw new Error(`Font stylesheet download failed: ${response.status}`);
const css = await response.text();
const blocks = [
  ...css.matchAll(/\/\* latin \*\/\s*(@font-face\s*\{[^}]+\})/g),
].map((match) => match[1]);
if (!blocks.length) throw new Error("Latin font blocks were not found.");
const seen = new Map();
const rewritten = [];
for (const block of blocks) {
  const remote = block.match(/url\(([^)]+)\)/)?.[1];
  if (!remote) continue;
  let filename = seen.get(remote);
  if (!filename) {
    filename = `${block.includes("Fraunces") ? "fraunces" : "manrope"}-${block.includes("italic") ? "italic" : "regular"}-${seen.size}.woff2`;
    const asset = await fetch(remote);
    if (!asset.ok) throw new Error("Font asset download failed.");
    await writeFile(
      new URL(filename, directory),
      Buffer.from(await asset.arrayBuffer()),
    );
    seen.set(remote, filename);
  }
  rewritten.push(
    block
      .replace(remote, `/fonts/${filename}`)
      .replaceAll("'Fraunces'", "'Paraiso Serif'")
      .replaceAll("'Manrope'", "'Paraiso Sans'"),
  );
}
await mkdir(new URL("../../src/styles/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../../src/styles/fonts.css", import.meta.url),
  rewritten.join("\n"),
);
for (const family of ["fraunces", "manrope"]) {
  const license = await fetch(
    `https://raw.githubusercontent.com/google/fonts/main/ofl/${family}/OFL.txt`,
  );
  if (!license.ok) throw new Error("Font license download failed.");
  await writeFile(
    new URL(`${family}-OFL.txt`, directory),
    await license.text(),
  );
}
console.log(
  `Saved ${seen.size} self-hosted font files and their open licenses.`,
);
