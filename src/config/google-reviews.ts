/** Owner-supplied official listing. No API, Place ID lookup, or credentials. */
export const googleReviewsConfig = {
  businessName: "Paraiso de June Quixote Ecofarm Resort",
  mapsUrl:
    "https://www.google.com/maps/place/Paraiso+de+June+Quixote+Ecofarm+Resort/@14.2714331,120.7741382,17z/data=!4m9!3m8!1s0x33bd87b79eb8145d:0x941edcf562f67f66!5m2!4m1!1i2!8m2!3d14.2714331!4d120.7741382!16s%2Fg%2F11rtl8x67w",
  // Paste only a verified direct review link supplied by the owner via Business Profile.
  writeReviewUrl: null as string | null,
};

/** Ignore malformed or unsafe optional links instead of breaking the page. */
export function getGoogleReviewUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim() || /[\s\\]/.test(value))
    return;
  try {
    const url = new URL(value);
    const hosts = [
      "www.google.com",
      "google.com",
      "maps.google.com",
      "search.google.com",
      "maps.app.goo.gl",
      "g.page",
    ];
    if (
      url.protocol === "https:" &&
      hosts.includes(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.port
    )
      return url.href;
  } catch {
    /* A missing or invalid optional link is simply omitted. */
  }
}

export function getWriteReviewLink(config = googleReviewsConfig) {
  const direct = getGoogleReviewUrl(config.writeReviewUrl);
  return { href: direct || config.mapsUrl, isDirect: !!direct };
}
