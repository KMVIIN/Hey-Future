export default function EclipseBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "eclipseBrand compact" : "eclipseBrand"} aria-label="Future">
      <div className="eclipseOrb" aria-hidden="true"><span /></div>
      {!compact && <div><div className="logo">FUTURE</div><div className="tag">Your AI Secretary</div></div>}
    </div>
  );
}
