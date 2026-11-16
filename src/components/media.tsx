import Image from "next/image";
export function Media({
  src,
  alt,
  label = "Resort surroundings",
  className = "",
  priority = false,
}: {
  src?: string | null;
  alt: string;
  label?: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`media ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 700px) 100vw, 65vw"
          priority={priority}
        />
      ) : (
        <>
          <div className="media-landscape" aria-hidden="true">
            <span />
            <span />
            <span />
            <i />
          </div>
          <span className="media-index" aria-hidden="true">
            PARAISO / FIELD NOTES
          </span>
          <div className="media-caption">
            <span>{label}</span>
            <span className="media-note">Photo awaiting approval</span>
          </div>
        </>
      )}
    </div>
  );
}
