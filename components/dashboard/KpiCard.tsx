export function KpiCard({
  label,
  value,
  sub,
  color = "var(--color-anu-text)",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      className="rounded-xl border p-4 text-center"
      style={{
        background: "var(--color-anu-surface)",
        borderColor: "var(--color-anu-border)",
      }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-2"
        style={{ color: "var(--color-anu-muted)" }}
      >
        {label}
      </p>
      <p className="text-3xl font-black leading-none mb-1" style={{ color }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs" style={{ color: "var(--color-anu-muted)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}
