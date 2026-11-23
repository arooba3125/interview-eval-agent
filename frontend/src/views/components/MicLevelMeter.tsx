/** Live input level so the candidate can see the mic is picking them up. */
export default function MicLevelMeter({ level, active }: { level: number; active: boolean }) {
  const bars = 12;
  const lit = active ? Math.round(level * bars) : 0;
  return (
    <div className="mic-meter" aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className={`mic-meter__bar${i < lit ? " is-lit" : ""}`} style={{ height: `${30 + i * 6}%` }} />
      ))}
    </div>
  );
}
