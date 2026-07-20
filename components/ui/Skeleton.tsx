"use client";

function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ background: "var(--color-anu-elevated)" }}
      aria-hidden
    />
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <Bone className={className} />;
}

export function PageSkeleton() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" role="status" aria-label="Loading">
      <Bone className="h-8 w-48 mb-4" />
      <Bone className="h-4 w-72 mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} className="h-24" />
        ))}
      </div>
      <Bone className="h-64 w-full" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6" role="status" aria-label="Loading">
      <Bone className="h-7 w-56 mb-6" />
      <div className="flex flex-wrap gap-3 mb-6">
        <Bone className="h-16 w-32" />
        <Bone className="h-16 w-40" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} className="h-28" />
        ))}
      </div>
      <Bone className="h-72 w-full" />
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="p-4 md:p-6 max-w-xl mx-auto" role="status" aria-label="Loading">
      <Bone className="h-7 w-40 mb-6" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="mb-4">
          <Bone className="h-3 w-24 mb-2" />
          <Bone className="h-11 w-full" />
        </div>
      ))}
      <Bone className="h-12 w-full mt-4" />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="p-4 md:p-6" role="status" aria-label="Loading">
      <Bone className="h-7 w-48 mb-4" />
      <Bone className="h-10 w-full mb-3" />
      {Array.from({ length: rows }).map((_, i) => (
        <Bone key={i} className="h-12 w-full mb-2" />
      ))}
    </div>
  );
}
