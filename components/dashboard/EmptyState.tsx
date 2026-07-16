export function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="rounded-xl border p-8 text-center text-sm"
      style={{
        background: "var(--color-anu-surface)",
        borderColor: "var(--color-anu-border)",
        color: "var(--color-anu-muted)",
      }}
    >
      {message}
    </div>
  );
}
