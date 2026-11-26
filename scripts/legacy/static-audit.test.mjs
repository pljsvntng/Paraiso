import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");
function assertExactPublicPath(url) {
  let directory = resolve(root, "out");
  for (const part of decodeURIComponent(url).replace(/^\//, "").split("/")) {
    assert.ok(readdirSync(directory).includes(part), `Exact production filename case: ${url}`);
    directory = resolve(directory, part);
  }
}
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(resolve(directory, entry.name))
      : [resolve(directory, entry.name)],
  );
}
const accommodationContent = loadTs("src/data/accommodations.ts", () => ({
  photos: JSON.parse(read("src/data/photo-catalog.json")),
  accommodationPhotos: JSON.parse(read("src/data/accommodation-photo-catalog.json")),
}));
const accommodationRoutes = accommodationContent.accommodations.map(stay => `accommodations/${stay.slug}`);
const routes = [
  "",
  "about",
  "accommodations",
  "adventures",
  "pool-cottages",
  "dining",
  "gallery",
  "guest-reviews",
  "packages",
  "contact",
  "faq",
  ...accommodationRoutes,
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
      "Static HTML must not expose a form that can send guest details before hydration",
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

test("static route payloads use the filenames requested by client navigation", () => {
  for (const route of routes.filter(Boolean)) {
    const segment = route.startsWith("accommodations/") ? "accommodations.$d$slug" : route;
    assert.ok(existsSync(resolve(root, `out/${route}/__next.${segment}.__PAGE__.txt`)),
      `Portable client-navigation payload for /${route}/`);
  }
});

test("accommodation cards export their own room pages and correctly associated photographs", () => {
  const { accommodations, accommodationPath } = accommodationContent;
  const listing = read("out/accommodations/index.html");
  const sources = new Set();
  assert.equal(new Set(accommodations.map(stay => stay.slug)).size, accommodations.length);
  for (const stay of accommodations) {
    const path = accommodationPath(stay.slug);
    assert.ok(listing.includes(`href="${path}"`), `${stay.name} has a detail link`);
    assert.ok(stay.photos.length > 0, `${stay.name} has its own photographs`);
    const html = read(`out${path}index.html`);
    assert.ok(html.includes('class="accommodation-detail-gallery'), `${stay.name} has a photo gallery`);
    assert.match(html, /<dialog\b[^>]*class="[^"]*\baccommodation-lightbox\b/, `${stay.name} has a native photo dialog`);
    assert.ok(html.includes('aria-label="Breadcrumb"'));
    assert.ok(html.includes('href="/accommodations/"'));
    assert.ok(html.includes("Inquire Now"));
    for (const photo of stay.photos) {
      assert.ok(!sources.has(photo.src), `Do not borrow a different room's photo: ${photo.src}`);
      sources.add(photo.src);
      assert.ok(existsSync(resolve(root, `public${photo.src}`)), `${stay.name} source exists`);
    }
  }
});

test("home and contact export the same verified resort map and exact destination links", () => {
  const { site } = loadTs("src/config/site.ts");
  assert.equal(site.locationVerified, true);
  assert.equal(site.address, "Mabacao, Tulay B, Maragondon, Cavite, Philippines");
  const listing = "0x33bd87b79eb8145d:0x941edcf562f67f66";
  for (const [key, pathname] of [["mapEmbedUrl", "/maps/embed"], ["mapUrl", "/maps/place/"], ["directionsUrl", "/maps/dir/"]]) {
    const url = new URL(site[key]);
    assert.equal(url.origin, "https://www.google.com");
    assert.ok(url.pathname.startsWith(pathname));
    assert.ok(decodeURIComponent(url.href).includes(listing), `${key} retains the verified listing ID`);
    assert.equal(url.searchParams.has("key"), false, "No Maps API key is needed");
  }
  for (const route of ["", "contact/"]) {
    const html = read(`out/${route}index.html`);
    assert.match(html, /Find Your Way to/);
    assert.ok(html.includes(site.address));
    const frame = html.match(/<iframe\b[^>]*class="map-frame"[^>]*>/)?.[0];
    assert.ok(frame, `Accessible map iframe on /${route}`);
    assert.ok(frame.includes(site.mapEmbedUrl));
    assert.match(frame, /title="Paraiso de June Quixote Ecofarm Resort[^"<>]+Google Map"/);
    assert.match(frame, /loading="lazy"/);
    assert.match(frame, /pointer-events:none/);
    assert.ok(html.includes(`href="${site.mapUrl}"`));
    assert.ok(html.includes(`href="${site.directionsUrl}"`));
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
  requireFn = (specifier) => {
    if (specifier === "./google-reviews") return loadTs("src/config/google-reviews.ts");
    if (specifier === "@/lib/dates") return loadTs("src/lib/dates.ts");
    throw new Error(`Unexpected import: ${specifier}`);
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

test("contextual inquiries preserve room/activity names and partner URL parameters", () => {
  const siteModule = loadTs("src/config/site.ts");
  const { booking, getBookingLink, getInquiryPath } = loadTs("src/config/booking.ts", () => siteModule);
  const subject = "Family Deluxe & balcony";
  const fallback = getBookingLink("stay", subject);
  assert.equal(fallback.external, false);
  assert.equal(fallback.context, true);
  const context = new URL(fallback.href, "https://audit.invalid");
  assert.equal(context.pathname, "/contact/");
  assert.equal(context.hash, "#inquiry");
  assert.equal(context.searchParams.get("interest"), "stay");
  assert.equal(context.searchParams.get("subject"), subject);
  assert.equal(new URL(getInquiryPath("group", "x".repeat(200)), "https://audit.invalid").searchParams.get("subject").length, 160);
  booking.mode = "external";
  booking.externalUrl = "https://partner.example.test/book?source=paraiso";
  const partner = new URL(getBookingLink("stay", subject).href);
  assert.equal(partner.searchParams.get("source"), "paraiso");
  assert.equal(partner.searchParams.get("subject"), subject);
  for (const invalid of ["javascript:alert(1)", "http://partner.example.test", "https://user:pass@partner.example.test"]) {
    booking.externalUrl = invalid;
    assert.equal(getBookingLink("stay", subject).context, true);
  }
  for (const stay of accommodationContent.accommodations) {
    const html = read(`out/accommodations/${stay.slug}/index.html`);
    assert.ok(html.includes(getInquiryPath("stay", stay.name).replaceAll("&", "&amp;")), `Room-specific inquiry for ${stay.name}`);
  }
});

test("catalog filters combine real categories, search and only verified optional facts", () => {
  const { filterCatalog, emptyCatalogFilters } = loadTs("src/lib/catalog.ts");
  const items = [
    { id: "one", title: "Family cabin", category: "Cabins", searchText: "A balcony", capacity: 4, price: 2000, amenities: ["Wi-Fi"] },
    { id: "two", title: "Bunk room", category: "Rooms", searchText: "Shared sleeping" },
    { id: "three", title: "Garden cabin", category: "Cabins", searchText: "Nature", capacity: 2, price: 1500 },
  ];
  assert.equal(filterCatalog(items, emptyCatalogFilters).length, 3);
  assert.deepEqual(filterCatalog(items, { ...emptyCatalogFilters, query: "FAMILY balcony", category: "Cabins" }).map(i => i.id), ["one"]);
  assert.deepEqual(filterCatalog(items, { ...emptyCatalogFilters, guests: "3", maxPrice: "2000", amenity: "Wi-Fi" }).map(i => i.id), ["one"]);
  assert.equal(filterCatalog(items, { ...emptyCatalogFilters, maxPrice: "100" }).length, 0);
  assert.equal(filterCatalog(items, { ...emptyCatalogFilters, guests: "1" }).some(i => i.id === "two"), false, "Unknown capacity must not qualify as verified capacity");
  assert.equal(items.length, 3);
});

test("inquiry drafts validate real contact/date formats and create email drafts without delivery", () => {
  const { validateInquiry, inquiryText, inquiryMailto } = loadTs("src/lib/inquiry.ts");
  const draft = { name: "QA Visitor", contact: "visitor@example.test", interest: "stay", subject: "Family Deluxe", date: "2026-11-21", guests: "4", message: "Please advise on arrangements for our visit." };
  assert.deepEqual(validateInquiry(draft, "2026-11-21"), {});
  assert.deepEqual(validateInquiry({ ...draft, contact: "+63 977 625 6513" }, "2026-11-21"), {});
  for (const contact of ["", "invalid", "visitor@invalid", "+1", "12345678901234567", "12+34567890"]) assert.ok(validateInquiry({ ...draft, contact }, "2026-11-21").contact);
  for (const date of ["2026-02-30", "2026-11-20", "tomorrow"]) assert.ok(validateInquiry({ ...draft, date }, "2026-11-21").date);
  assert.ok(validateInquiry({ ...draft, guests: "2.5" }, "2026-11-21").guests);
  assert.ok(validateInquiry({ ...draft, name: "", message: "", interest: "invented" }, "2026-11-21").message);
  const mail = new URL(inquiryMailto("resort@example.test", draft));
  assert.equal(mail.protocol, "mailto:");
  assert.equal(mail.pathname, "resort@example.test");
  assert.equal(mail.searchParams.get("body"), inquiryText(draft));
  assert.match(mail.searchParams.get("body"), /Interested in: Family Deluxe/);
  assert.match(mail.searchParams.get("body"), /not a confirmed reservation/);
  assert.doesNotMatch(read("src/components/shared/inquiry-form.tsx"), /fetch\(|localStorage|sessionStorage/);
});

test("promotion dates honor Manila boundaries, invalid dates and publication status", () => {
  const { manilaDate, isCalendarDate } = loadTs("src/lib/dates.ts");
  const { getActivePromotions } = loadTs("src/data/promotions.ts");
  assert.equal(manilaDate(new Date("2026-11-20T16:00:00Z")), "2026-11-21");
  assert.equal(isCalendarDate("2026-02-30"), false);
  const base = { id: "fixture", active: true, displayOrder: 0, startDate: "2026-11-20", endDate: "2026-11-20" };
  assert.equal(getActivePromotions([base], new Date("2026-11-20T15:59:59Z")).length, 1);
  assert.equal(getActivePromotions([base], new Date("2026-11-20T16:00:00Z")).length, 0);
  const now = new Date("2026-11-21T04:00:00Z");
  const valid = { ...base, endDate: "2026-11-25" };
  assert.equal(getActivePromotions([valid], now).length, 1);
  for (const invalid of [{ ...valid, startDate: "2026-11-22" }, { ...valid, endDate: "invalid" }, { ...valid, startDate: "2026-11-30" }, { ...valid, status: "draft" }, { ...valid, status: "archived" }, { ...valid, active: false }]) assert.equal(getActivePromotions([invalid], now).length, 0);
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

test("all responsive image candidates and originals exist with exact production casing", () => {
  const catalog = {
    ...JSON.parse(read("src/data/photo-catalog.json")),
    ...JSON.parse(read("src/data/accommodation-photo-catalog.json")),
  };
  const variants = JSON.parse(read("src/data/image-variants.json"));
  const originals = new Set();
  const delivery = new Set();
  for (const photo of Object.values(catalog)) {
    assert.ok(photo.alt.trim().length > 15 && photo.title.trim());
    assert.ok(!originals.has(photo.src), `No repeated gallery original: ${photo.src}`);
    originals.add(photo.src);
    assertExactPublicPath(photo.src);
    if (photo.delivery) assertExactPublicPath(photo.delivery);
    const image = variants[photo.src];
    assert.ok(image && image.width > 0 && image.height > 0, `Dimensions for ${photo.src}`);
    assert.ok(!delivery.has(image.src), `No duplicate gallery delivery URL: ${image.src}`);
    delivery.add(image.src);
    let previousWidth = 0;
    for (const candidate of image.srcSet.split(", ")) {
      const [src, descriptor] = candidate.split(" ");
      const width = Number(descriptor.replace(/w$/, ""));
      assert.ok(width > previousWidth && width <= image.width);
      previousWidth = width;
      assertExactPublicPath(src);
    }
    assertExactPublicPath(image.src);
    if (image.mobile) {
      assertExactPublicPath(image.mobile.src);
      for (const candidate of image.mobile.srcSet.split(", ")) assertExactPublicPath(candidate.split(" ")[0]);
    }
  }
  assert.equal(Object.keys(variants).length, originals.size, "No stale generated mappings");
});

test("exported image markup uses accessible static responsive sources", () => {
  for (const route of routes) {
    const html = read(`out/${route ? route + "/" : ""}index.html`);
    assert.doesNotMatch(html, /\/_next\/image\?/);
    let brandCount = 0;
    for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
      assert.match(tag, /alt="[^"]+"/);
      assert.match(tag, /loading="(?:lazy|eager)"/);
      const src = tag.match(/\bsrc="([^"]+)"/)?.[1];
      if (/class="brand-mark"/.test(tag)) {
        brandCount++;
        assert.match(src, /^\/_next\/static\/media\/icon(?:-on-light)?\.[^/]+\.svg$/);
        assertExactPublicPath(src);
        const onLight = src.includes("/icon-on-light.");
        const original = read(`public/branding/${onLight ? "icon-on-light" : "icon"}.svg`);
        assert.equal(read(`out${src}`), original, "Serve the exact transparent emblem variant");
        assert.match(original, new RegExp(`fill="${onLight ? "#193F32" : "#FFFFFF"}"`));
        assert.doesNotMatch(original, /<rect\b|<defs\b|url\(#|filter=/);
        assert.match(original, /width="1254" height="1254" viewBox="0 0 1254 1254"/);
        assert.match(tag, /width="44" height="44"/);
        const favicon = html.match(/<link\b(?=[^>]*rel="icon")[^>]*>/)?.[0];
        assert.match(favicon, /href="\/_next\/static\/media\/icon-on-light\.[^/]+\.svg"/, "Versioned favicon remains readable on light browser chrome");
        continue;
      }
      assert.ok(src?.startsWith("/images/"));
      assertExactPublicPath(src);
      const srcset = tag.match(/\bsrcSet="([^"]+)"/i)?.[1];
      if (srcset) {
        assert.match(tag, /sizes="[^"]+"/);
        assert.match(tag, /width="\d+"/);
        assert.match(tag, /height="\d+"/);
        for (const candidate of srcset.split(",")) assertExactPublicPath(candidate.trim().split(" ")[0]);
      }
    }
    assert.equal(brandCount, 2, `Header and footer use the supplied logo on /${route}`);
  }
  const home = read("out/index.html");
  assert.equal((home.match(/<link[^>]+as="image"[^>]+imageSrcSet="\/images\/optimized\/hero[^>]+>/g) || []).length, 2, "Mutually exclusive mobile and desktop hero preloads");
  assert.match(home, /<source media="\(max-width: 700px\)" srcSet="[^"]+" sizes="100vw"/);
  assert.match(home, /class="responsive-image hero-photo"[^>]+loading="eager"[^>]+fetchPriority="high"/i);
});

test("promotions filter inactive entries and sort without changing the source", () => {
  const { getActivePromotions, getPromotionLink } = loadTs("src/data/promotions.ts");
  const items = [
    { id: "last", active: true, displayOrder: 3 },
    { id: "inactive", active: false, displayOrder: 0 },
    { id: "first", active: true, displayOrder: 1 },
    { id: "tied", active: true, displayOrder: 1 },
  ];
  assert.deepEqual(getActivePromotions(items).map((item) => item.id), ["first", "tied", "last"]);
  assert.deepEqual(items.map((item) => item.id), ["last", "inactive", "first", "tied"]);
  assert.deepEqual(getActivePromotions([]), []);
  assert.deepEqual(getActivePromotions([{ active: false, displayOrder: 1 }]), []);
  for (const href of ["/contact/", "https://example.test/details", "mailto:test@example.test", "tel:+630000000000"])
    assert.equal(getPromotionLink(href), href);
  assert.equal(getPromotionLink("HTTPS://EXAMPLE.TEST/details"), "https://example.test/details");
  for (const href of [undefined, "", "javascript:alert(1)", "//example.test", "/\\example.test", "data:text/html,test", "broken link"])
    assert.equal(getPromotionLink(href), undefined);
});

test("homepage exports the promotions section and only approved active posters", () => {
  const { promotions, getActivePromotions } = loadTs("src/data/promotions.ts");
  const html = read("out/index.html");
  const ids = new Set();
  for (const item of promotions) {
    assert.ok(item.id && !ids.has(item.id), "Promotion IDs must be unique");
    ids.add(item.id);
    assert.ok(item.title?.trim() && item.description?.trim(), "Posters need approved title and description");
    assert.equal(typeof item.active, "boolean");
    assert.ok(Number.isFinite(item.displayOrder));
    if (item.active) {
      assert.match(item.image, /^\/images\/promotions\/(?!.*\.\.)[^?#]+\.(webp|png|jpe?g|avif)$/i);
      assert.ok(existsSync(resolve(root, "out", "." + item.image)), `Uploaded poster exists: ${item.image}`);
    }
  }
  assert.equal((html.match(/id="promotions"/g) || []).length, 1);
  assert.ok(html.indexOf('id="pool-title"') < html.indexOf('id="promotions"'));
  assert.ok(html.indexOf('id="promotions"') < html.indexOf('id="stay-title"'));
  const active = getActivePromotions().filter(item => item.featured !== false);
  assert.equal((html.match(/class="promotion-card"/g) || []).length, active.length);
  assert.equal(html.includes('class="promotions-empty"'), active.length === 0);
});

test("review publication excludes unapproved entries and all private fields", () => {
  const { getApprovedReviews, guestReviews } = loadTs("src/data/reviews.ts", name => loadTs(name.includes("google-reviews") ? "src/config/google-reviews.ts" : "src/types/reviews.ts"));
  const base = { guestName: "Test fixture", source: "Google Maps", rating: 4, message: "Test fixture content, never published.", reviewDate: "2026-10-01" };
  const items = [
    { ...base, id: "pending", approved: false, email: "private@example.test" },
    { ...base, id: "approved", approved: true, email: "private@example.test", bookingReference: "PRIVATE" },
    { ...base, id: "rejected", approved: false },
    { ...base, id: "newest", guestName: "Other fixture", reviewDate: "2026-11-01", approved: true },
  ];
  const published = getApprovedReviews(items);
  assert.deepEqual(published.map(item => item.id), ["newest", "approved"]);
  for (const item of published) {
    assert.equal("email" in item, false);
    assert.equal("bookingReference" in item, false);
    assert.equal("approved" in item, false);
  }
  assert.equal(items.length, 4, "Publication must not mutate source data");
  assert.ok(guestReviews.every(item => !Object.keys(item).some(key => /email|booking|phone/i.test(key))));
  assert.ok(getApprovedReviews().every(item => !item.isPlaceholder));
});

test("review filters and sorting handle combinations without mutating the source", () => {
  const types = loadTs("src/types/reviews.ts");
  const { filterReviews } = loadTs("src/lib/reviews.ts", () => types);
  const items = [
    { id: "older-five", rating: 5, visitType: "Day Tour", reviewDate: "2026-10-01" },
    { id: "newer-four", rating: 4, visitType: "Staycation", reviewDate: "2026-11-02" },
    { id: "newer-five", rating: 5, visitType: "Day Tour", reviewDate: "2026-11-01" },
  ];
  assert.deepEqual(filterReviews(items, "all", "all", "newest").map(item => item.id), ["newer-four", "newer-five", "older-five"]);
  assert.deepEqual(filterReviews(items, "all", "all", "highest").map(item => item.id), ["newer-five", "older-five", "newer-four"]);
  assert.deepEqual(filterReviews(items, "5", "Day Tour", "newest").map(item => item.id), ["newer-five", "older-five"]);
  assert.deepEqual(filterReviews(items, "5", "Staycation", "newest"), []);
  assert.equal(items[0].id, "older-five");
});

test("local reviews tolerate malformed records, invalid optional metadata and duplicates", () => {
  const { getApprovedReviews } = loadTs("src/data/reviews.ts", name => loadTs(name.includes("google-reviews") ? "src/config/google-reviews.ts" : "src/types/reviews.ts"));
  const valid = { id: "fixture", guestName: "Test fixture", rating: 5, message: "Isolated fixture only.", source: "Google Maps", approved: true };
  const items = [null, {}, "invalid", { ...valid, rating: 6 }, { ...valid, rating: 1.5 }, { ...valid, message: "" }, { ...valid, guestName: " " }, { ...valid, source: "Unknown" },
    { ...valid, reviewDate: "2026-02-30", visitType: "Invalid", originalReviewUrl: "javascript:alert(1)" },
    { ...valid }, { ...valid, id: "duplicate-content", message: "Isolated   fixture only." },
  ];
  const result = getApprovedReviews(items);
  assert.equal(result.length, 1);
  assert.equal(result[0].reviewDate, undefined);
  assert.equal(result[0].visitType, undefined);
  assert.equal(result[0].originalReviewUrl, undefined);
  assert.deepEqual(getApprovedReviews(null), []);
  const { reviewExcerpt } = loadTs("src/lib/reviews.ts");
  assert.equal(reviewExcerpt("Short review."), null);
  assert.ok(reviewExcerpt("Long review text. ".repeat(100)).length <= 260);
  assert.equal(reviewExcerpt("x".repeat(1000)).length, 260);
});

test("reviews export genuine empty states and Google-only submission actions", () => {
  const home = read("out/index.html");
  const reviews = read("out/guest-reviews/index.html");
  assert.equal((home.match(/id="guest-reviews"/g) || []).length, 1);
  assert.ok(home.indexOf('id="dining-title"') < home.indexOf('id="guest-reviews"'));
  assert.match(home, /Explore All Guest Reviews/);
  for (const html of [home, reviews]) {
    assert.match(html, /What Our/);
    assert.match(html, /View All Reviews on Google/);
    assert.match(html, /Write a Google Review/);
    assert.match(html, /href="\/guest-reviews\/"/);
    assert.doesNotMatch(html, /aggregateRating|ratingValue|reviewCount/);
    assert.doesNotMatch(html, /Layout preview|Sample rating|Share Your Experience|review-dialog|<form\b/);
    const { googleReviewsConfig } = loadTs("src/config/google-reviews.ts");
    for (const [, attributes] of html.matchAll(/<a\b([^>]*href="https:\/\/www\.google\.com\/maps\/place\/[^>]+)>/g)) {
      assert.ok(attributes.includes(googleReviewsConfig.mapsUrl));
      assert.match(attributes, /target="_blank"/);
      assert.match(attributes, /rel="noopener noreferrer"/);
    }
  }
  const { getApprovedReviews } = loadTs("src/data/reviews.ts", name => loadTs(name.includes("google-reviews") ? "src/config/google-reviews.ts" : "src/types/reviews.ts"));
  if (!getApprovedReviews().length) {
    assert.match(home, /Your story could be/);
    assert.match(reviews, /Your story could be/);
    assert.doesNotMatch(home + reviews, /class="review-card"|class="review-stars"/);
  }
  assert.match(reviews, /Visit Our Facebook Page/);
  assert.match(read("out/contact/index.html"), /does not collect review submissions/);
});

test("Google links use the exact supplied listing and safe optional direct links", () => {
  const { googleReviewsConfig, getGoogleReviewUrl, getWriteReviewLink } = loadTs("src/config/google-reviews.ts");
  const expected = "https://www.google.com/maps/place/Paraiso+de+June+Quixote+Ecofarm+Resort/@14.2714331,120.7741382,17z/data=!4m9!3m8!1s0x33bd87b79eb8145d:0x941edcf562f67f66!5m2!4m1!1i2!8m2!3d14.2714331!4d120.7741382!16s%2Fg%2F11rtl8x67w";
  assert.equal(googleReviewsConfig.mapsUrl, expected);
  assert.equal(loadTs("src/config/site.ts").site.mapUrl, expected);
  assert.deepEqual(getWriteReviewLink(), { href: expected, isDirect: false });
  // Format-only URL fixture, never configured as the resort's direct review link.
  const direct = "https://g.page/r/qa-only-fixture/review";
  assert.deepEqual(getWriteReviewLink({ ...googleReviewsConfig, writeReviewUrl: direct }), { href: direct, isDirect: true });
  for (const value of [null, "", "invalid", "javascript:alert(1)", "http://www.google.com/maps", "https://google.com.evil.test/review", "https://user:pass@google.com/maps", "https://example.test/review", "//google.com/maps"]) {
    assert.equal(getGoogleReviewUrl(value), undefined);
    assert.equal(getWriteReviewLink({ ...googleReviewsConfig, writeReviewUrl: value }).href, expected);
  }
  assert.ok(!existsSync(resolve(root, "src/components/reviews/review-form.tsx")));
});
