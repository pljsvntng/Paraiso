"use client";

import { useState, useSyncExternalStore, type CSSProperties } from "react";
import { getPhoto } from "@/config/media";
const subscribeHydration = () => () => {};
const clientHydration = () => true;
const serverHydration = () => false;

/** Native srcset is required because this project deploys without an image server. */
export function ResponsiveImage({
  src,
  alt,
  sizes = "100vw",
  priority = false,
  className = "",
  style,
  fit,
  position,
  original = false,
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
  fit?: "cover" | "contain";
  position?: string;
  original?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    clientHydration,
    serverHydration,
  );
  const photo = getPhoto(src);
  const image = original ? src : photo?.src || src;
  const mobile = priority && !original ? photo?.mobile : undefined;
  const pending = loadedSource !== image;
  if (failedSource === image)
    return (
      <span
        className="image-fallback"
        role="img"
        aria-label={`${alt}. Photograph unavailable.`}
      >
        <span>
          {alt}
          <small>Photograph temporarily unavailable</small>
        </span>
      </span>
    );
  const imageElement = (
    // eslint-disable-next-line @next/next/no-img-element -- explicit static srcset; no optimizer on the deployment host.
    <img
      className={`responsive-image ${className}`}
      src={image}
      alt={alt}
      ref={(element) => {
        // A static page's image can fail before React hydrates its onError handler.
        if (element?.complete) {
          if (element.naturalWidth === 0) setFailedSource(image);
          else if (pending) setLoadedSource(image);
        }
      }}
      srcSet={original ? undefined : photo?.srcSet}
      sizes={!original && photo?.srcSet ? sizes : undefined}
      width={photo?.width}
      height={photo?.height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      onLoad={() => setLoadedSource(image)}
      onError={() => setFailedSource(image)}
      style={{
        objectPosition: position || photo?.position,
        objectFit: fit || photo?.fit || "cover",
        ...style,
      }}
    />
  );
  const placeholder =
    pending && hydrated ? (
      <span className="image-loading" aria-hidden="true">
        Loading photograph
      </span>
    ) : null;
  if (!mobile)
    return (
      <>
        {imageElement}
        {placeholder}
      </>
    );
  // Picture suppresses React's automatic img preload; these media queries are exclusive.
  return (
    <>
      <link
        rel="preload"
        as="image"
        media="(max-width: 700px)"
        imageSrcSet={mobile.srcSet}
        imageSizes="100vw"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        media="(min-width: 701px)"
        imageSrcSet={photo?.srcSet}
        imageSizes={sizes}
        fetchPriority="high"
      />
      <picture>
        <source
          media="(max-width: 700px)"
          srcSet={mobile.srcSet}
          sizes="100vw"
        />
        {imageElement}
      </picture>
      {placeholder}
    </>
  );
}
