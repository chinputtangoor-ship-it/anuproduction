import { OPS } from "@/components/dashboard/ops/ops-theme";

export function OpsSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-1 h-5 rounded-full" style={{ background: OPS.blue }} />
      <p
        className="text-sm font-bold tracking-wide uppercase"
        style={{ color: OPS.blue }}
      >
        {children}
      </p>
    </div>
  );
}
