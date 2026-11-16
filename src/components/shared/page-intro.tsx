import Link from "next/link";
export function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="page-intro container">
      <div className="breadcrumb">
        <Link href="/">Paraiso</Link>
        <span>/</span>
        <span>{eyebrow}</span>
      </div>
      <div className="intro-grid">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
        <div className="intro-description">
          <p>{description}</p>
          {children}
        </div>
      </div>
    </section>
  );
}
