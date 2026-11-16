import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(resolve(directory, entry.name))
      : [resolve(directory, entry.name)],
  );
}
const routes = [
  "",
  "about",
  "accommodations",
  "adventures",
  "pool-cottages",
  "dining",
  "gallery",
  "packages",
  "contact",
  "faq",
];

test("every required route has a complete exported HTML document", () => {
  const { site } = loadTs("src/config/site.ts");
  for (const route of routes) {
    const html = read(`out/${route ? route + "/" : ""}index.html`);
    assert.match(html, /<html lang="en"/);
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, `One h1 on /${route}`);
    assert.match(html, /<main[^>]+id="main"/);
    if (!site.allowIndexing) assert.match(
      html,
      /noindex/,
      "Review build must remain noindex until client approval",
    );
    assert.doesNotMatch(
      html,
      /<form\b/,
      "Static site must not collect guest information",
    );
  }
});

test("exported pages have no broken internal links, fragments, scripts or media", () => {
  for (const route of routes) {
    const html = read(`out/${route ? route + "/" : ""}index.html`);
    for (const [, raw] of html.matchAll(/(?:href|src)="([^"<>]+)"/g)) {
      const value = raw.replaceAll("&amp;", "&");
      if (!value.startsWith("/") && !value.startsWith("#")) continue;
      const url = new URL(
        value,
        `https://audit.invalid/${route ? route + "/" : ""}`,
      );
      let path = resolve(root, "out", "." + decodeURIComponent(url.pathname));
      if (existsSync(path) && statSync(path).isDirectory())
        path = resolve(path, "index.html");
      assert.ok(existsSync(path), `${route || "/"} -> ${value} exists`);
      if (url.hash) {
        const target = readFileSync(path, "utf8");
        assert.ok(
          target.includes(`id="${url.hash.slice(1)}"`),
          `${value} has a real anchor`,
        );
      }
    }
  }
});

test("no server application, secret configuration, or backend dependencies remain", () => {
  const source = files(resolve(root, "src"));
  assert.ok(
    !source.some((path) =>
      /[\\/](api|admin)[\\/]|[\\/]route\.[jt]s$/.test(path),
    ),
  );
  for (const path of source.filter((path) => /\.[jt]sx?$/.test(path))) {
    assert.doesNotMatch(
      readFileSync(path, "utf8"),
      /next-auth|@prisma|from ['"](?:pg|resend|cloudinary)['"]|['"]use server['"]|DATABASE_URL|fetch\(/,
    );
  }
  const pkg = JSON.parse(read("package.json"));
  for (const dep of [
    "@prisma/client",
    "prisma",
    "next-auth",
    "@auth/prisma-adapter",
    "resend",
    "cloudinary",
    "zod",
    "@electric-sql/pglite",
  ])
    assert.ok(
      !pkg.dependencies?.[dep] && !pkg.devDependencies?.[dep],
      `${dep} removed`,
    );
  for (const path of ["prisma/schema.prisma", ".env.example"])
    assert.ok(!existsSync(resolve(root, path)));
  assert.ok(
    !existsSync(resolve(root, "out/admin")) &&
      !existsSync(resolve(root, "out/booking")),
  );
});

// Exercise the actual integration configuration without a browser or another test runtime.
function loadTs(
  path,
  requireFn = () => {
    throw new Error("Unexpected import");
  },
) {
  const code = ts.transpileModule(read(path), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function("require", "module", "exports", code)(
    requireFn,
    loadedModule,
    loadedModule.exports,
  );
  return loadedModule.exports;
}
test("booking integration supports contact fallback and safe external linking", () => {
  const siteModule = loadTs("src/config/site.ts");
  const { booking, getBookingLink } = loadTs(
    "src/config/booking.ts",
    () => siteModule,
  );
  booking.mode = "contact";
  assert.equal(getBookingLink("stay").href, siteModule.site.facebook);
  assert.equal(getBookingLink().isInquiry, true);
  booking.mode = "external";
  booking.externalUrl = "https://booking.example.test/visit?source=paraiso";
  const valid = new URL(getBookingLink("cottage").href);
  assert.equal(valid.searchParams.get("interest"), "cottage");
  assert.equal(valid.searchParams.get("source"), "paraiso");
  assert.equal(getBookingLink("cottage").isInquiry, false);
  for (const invalid of [
    "",
    "broken url",
    "javascript:alert(1)",
    "http://booking.example.test",
  ]) {
    booking.externalUrl = invalid;
    assert.equal(getBookingLink().href, siteModule.site.facebook);
    assert.equal(getBookingLink().isInquiry, true);
  }
});

test("all exported reservation CTAs follow the centralized integration configuration", () => {
  const siteModule = loadTs("src/config/site.ts");
  const { getBookingLink } = loadTs("src/config/booking.ts", () => siteModule);
  const expected = getBookingLink();
  const expectedUrl = new URL(expected.href);
  for (const route of routes) {
    const html = read(`out/${route ? route + "/" : ""}index.html`);
    const ctas = [
      ...html.matchAll(
        /<a\b([^>]*aria-label="[^"]*(?:inquire on the official Facebook page|open the reservation website)[^"]*"[^>]*)>/g,
      ),
    ];
    assert.ok(ctas.length > 0, `Configured CTA exists on /${route}`);
    for (const [, attributes] of ctas) {
      const href = attributes.match(/href="([^"]+)"/)?.[1].replaceAll('&amp;', '&');
      assert.ok(href);
      const target = new URL(href);
      assert.equal(target.origin, expectedUrl.origin);
      assert.equal(target.pathname, expectedUrl.pathname);
      if (expected.isInquiry) assert.equal(target.href, expectedUrl.href);
      assert.match(attributes, /rel="noopener noreferrer"/);
    }
  }
});

test("font assets are self-hosted and the export uses static image handling", () => {
  const css = read("src/styles/fonts.css");
  assert.doesNotMatch(css, /https?:\/\//);
  for (const [, asset] of css.matchAll(/url\(([^)]+)\)/g))
    assert.ok(existsSync(resolve(root, "out", "." + asset)));
  assert.match(read("next.config.ts"), /output:\s*["']export["']/);
  assert.match(read("next.config.ts"), /unoptimized:\s*true/);
  assert.ok(existsSync(resolve(root, "out/robots.txt")));
  assert.ok(existsSync(resolve(root, "out/404.html")));
});
