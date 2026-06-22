"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PRODUCTION_LINES } from "@/lib/constants/production";
import { fetchRunningBatches } from "@/lib/data/production";
import {
  readProductionContext,
  writeProductionContext,
  clearProductionContext,
} from "@/lib/production/context";
import { useI18n } from "@/lib/i18n/context";

type FlowStep = "line" | "batch" | "record";

type ProductionFlowShellProps = {
  title: string;
  titleIcon: string;
  noBatchKey: string;
  lineCols?: 4 | 6;
  batchCols?: 2 | 4;
  headerExtra?: ReactNode;
  resumeContext?: boolean;
  onBatchReady?: (line: string, batch: string) => void;
  children: (ctx: { line: string; batch: string }) => ReactNode;
};

const cardStyle = {
  background: "var(--color-anu-surface)",
  borderColor: "var(--color-anu-border)",
};

export function ProductionFlowShell({
  title,
  titleIcon,
  noBatchKey,
  lineCols = 4,
  batchCols = 2,
  headerExtra,
  resumeContext = true,
  onBatchReady,
  children,
}: ProductionFlowShellProps) {
  const router = useRouter();
  const { t } = useI18n();

  const [step, setStep] = useState<FlowStep>("line");
  const [selLine, setSelLine] = useState("");
  const [selBatch, setSelBatch] = useState("");
  const [batches, setBatches] = useState<{ batch: string }[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [resumed, setResumed] = useState(false);

  const loadBatches = useCallback(async (line: string) => {
    setLoadingBatches(true);
    try {
      const data = await fetchRunningBatches(line);
      setBatches(data);
    } catch {
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  const selectBatch = useCallback(
    (line: string, batch: string) => {
      setSelLine(line);
      setSelBatch(batch);
      writeProductionContext({ line, batch });
      setStep("record");
      onBatchReady?.(line, batch);
    },
    [onBatchReady],
  );

  useEffect(() => {
    if (!resumeContext || resumed) return;

    const ctx = readProductionContext();
    if (!ctx) {
      setResumed(true);
      return;
    }

    fetchRunningBatches(ctx.line)
      .then((data) => {
        if (data.some((item) => item.batch === ctx.batch)) {
          setSelLine(ctx.line);
          setSelBatch(ctx.batch);
          setBatches(data);
          setStep("record");
          onBatchReady?.(ctx.line, ctx.batch);
        }
      })
      .finally(() => setResumed(true));
  }, [resumeContext, resumed, onBatchReady]);

  const handleSelectLine = (line: string) => {
    setSelLine(line);
    setSelBatch("");
    loadBatches(line);
    setStep("batch");
  };

  const handleBack = () => {
    if (step === "record") {
      setStep("batch");
      setSelBatch("");
      return;
    }
    if (step === "batch") {
      setStep("line");
      setSelLine("");
      setBatches([]);
      return;
    }
    router.push("/dashboard");
  };

  const handleChangeLine = () => {
    clearProductionContext();
    setStep("line");
    setSelLine("");
    setSelBatch("");
    setBatches([]);
  };

  const backLabel =
    step === "line" ? t("common.home") :
    step === "batch" ? t("common.change_line") :
    t("common.change_batch");

  const lineGridClass = lineCols === 6
    ? "grid grid-cols-4 lg:grid-cols-6 gap-3"
    : "grid grid-cols-4 gap-3";

  const batchGridClass = batchCols === 4
    ? "grid grid-cols-2 lg:grid-cols-4 gap-3"
    : "grid grid-cols-2 gap-3";

  return (
    <div className="w-full min-h-screen" style={{ background: "var(--color-anu-void)" }}>
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6">

        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleBack}
            className="text-sm px-3 py-1.5 rounded-lg border"
            style={cardStyle}
          >
            ← {backLabel}
          </button>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-anu-text)" }}>
            {titleIcon} {title}
          </h1>
          {headerExtra}
        </div>

        {step !== "line" && (
          <div className="flex flex-wrap items-center gap-2 mb-6 text-sm">
            <span style={{ color: "var(--color-anu-glow)" }}>{selLine}</span>
            {selBatch && (
              <>
                <span style={{ color: "var(--color-anu-muted)" }}>›</span>
                <span style={{ color: "var(--color-anu-glow)" }}>{selBatch}</span>
              </>
            )}
            {step === "record" && (
              <button
                onClick={handleChangeLine}
                className="ml-auto text-xs px-2.5 py-1 rounded-lg border"
                style={cardStyle}
              >
                {t("common.change_line")}
              </button>
            )}
          </div>
        )}

        {step === "line" && (
          <div>
            <p className="text-sm mb-4" style={{ color: "var(--color-anu-muted)" }}>
              {t("common.select_line")}
            </p>
            <div className={lineGridClass}>
              {PRODUCTION_LINES.map((line) => (
                <button
                  key={line}
                  onClick={() => handleSelectLine(line)}
                  className="py-4 rounded-xl border text-sm font-semibold transition hover:scale-105"
                  style={cardStyle}
                >
                  <span style={{ color: "var(--color-anu-text)" }}>{line}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "batch" && (
          <div>
            <p className="text-sm mb-4" style={{ color: "var(--color-anu-muted)" }}>
              {t("common.select_batch")}
            </p>
            {loadingBatches ? (
              <p style={{ color: "var(--color-anu-muted)" }}>{t("common.loading")}</p>
            ) : batches.length === 0 ? (
              <p style={{ color: "var(--color-anu-danger)" }}>
                {t(noBatchKey, { line: selLine })}
              </p>
            ) : (
              <div className={batchGridClass}>
                {batches.map((item) => (
                  <button
                    key={item.batch}
                    onClick={() => selectBatch(selLine, item.batch)}
                    className="py-4 px-4 rounded-xl border text-sm font-semibold transition hover:scale-105"
                    style={cardStyle}
                  >
                    <span style={{ color: "var(--color-anu-text)" }}>{item.batch}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "record" && selLine && selBatch && children({ line: selLine, batch: selBatch })}
      </div>
    </div>
  );
}
