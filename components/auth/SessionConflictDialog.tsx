"use client";

import { useI18n } from "@/lib/i18n/context";

export function SessionConflictDialog({
  otherLabel,
  onUseNew,
  onKeepOld,
  busy,
}: {
  otherLabel?: string;
  onUseNew: () => void;
  onKeepOld: () => void;
  busy?: boolean;
}) {
  const { t } = useI18n();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "var(--color-anu-overlay)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-6 flex flex-col gap-4"
        style={{ background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" }}
      >
        <div>
          <h2 className="text-base font-bold" style={{ color: "var(--color-anu-text)" }}>
            {t("session.conflict_title")}
          </h2>
          <p className="text-sm mt-2" style={{ color: "var(--color-anu-muted)" }}>
            {t("session.conflict_body")}
            {otherLabel ? ` (${otherLabel})` : ""}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onUseNew}
          className="min-h-[44px] rounded-lg text-sm font-semibold"
          style={{ background: "var(--color-anu-accent)", color: "#fff" }}
        >
          {t("session.use_new")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onKeepOld}
          className="min-h-[44px] rounded-lg text-sm font-semibold border"
          style={{
            background: "var(--color-anu-elevated)",
            color: "var(--color-anu-text)",
            borderColor: "var(--color-anu-border)",
          }}
        >
          {t("session.keep_old")}
        </button>
      </div>
    </div>
  );
}
