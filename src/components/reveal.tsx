/** Static markup stays readable before hydration and without JavaScript.
 * MotionExperience progressively enhances these markers with the shared observer. */
export function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className} data-reveal="rise">
      {children}
    </div>
  );
}
