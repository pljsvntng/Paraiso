import { ResponsiveImage } from "@/components/responsive-image";
import { getPhoto, resortMedia, type ResortMediaKey } from "@/config/media";
export function Media({
  src,
  asset,
  alt,
  label = "Resort surroundings",
  className = "",
  priority = false,
  sizes = "(max-width: 700px) calc(100vw - 40px), 65vw",
  natural = false,
}: {
  src?: string | null;
  asset?: ResortMediaKey;
  alt: string;
  label?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  natural?: boolean;
}) {
  const photo = src ? getPhoto(src) : asset ? resortMedia[asset] : null;
  const image = src || photo?.src;
  return (
    <div
      className={`media ${image ? "has-photo" : "photo-pending"} ${natural ? "media-natural" : ""} ${photo?.fit === "contain" ? "media-contain" : ""} ${className}`}
      style={natural && photo ? { aspectRatio: `${photo.width} / ${photo.height}` } : undefined}
    >
      {image ? (
        <ResponsiveImage
          src={image}
          alt={photo?.alt || alt}
          sizes={sizes}
          priority={priority}
        />
      ) : (
        <>
          <span className="media-index" aria-hidden="true">
            PARAISO DE JUNE QUIXOTE
          </span>
          <div className="media-caption">
            <span>{label}</span>
            <span className="media-note">Resort photograph to follow</span>
          </div>
        </>
      )}
    </div>
  );
}
