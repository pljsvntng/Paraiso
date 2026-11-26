// Next.js 16.4's Windows export can leave segment payloads in nested directories
// even though the browser requests dot-separated filenames. Add portable copies
// to the deployment artifact, without changing Next.js or removing any files.
import { readdir, copyFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const root = resolve("out");
let copied = 0;
async function walk(directory, parts = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = [...parts, entry.name];
    const file = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!["_next", "images", "fonts"].includes(entry.name)) await walk(file, relative);
    } else if (entry.name.endsWith(".txt")) {
      const start = relative.findIndex(part => part.startsWith("__next."));
      if (start !== -1 && start < relative.length - 1) {
        const destination = join(root, ...relative.slice(0, start), relative.slice(start).join("."));
        await copyFile(file, destination);
        copied++;
      }
    }
  }
}
await walk(root);
console.log(`Static export ready; normalized ${copied} Windows route payload paths.`);
