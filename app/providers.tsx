"use client";

import { usePathname } from "next/navigation";
import { GlobalHeader } from "@/components/GlobalHeader";
import { PwaRegister } from "@/components/PwaRegister";
import { Sidebar } from "@/components/Sidebar";
import { AuthProvider, useAuth } from "@/lib/auth/AuthProvider";
import { I18nProvider } from "@/lib/i18n/context";
import { ThemeProvider } from "@/lib/theme/context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <PwaRegister />
          <GlobalHeader />
          <AppBody>{children}</AppBody>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

function AppBody({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isLogin = pathname === "/login";

  if (isLogin) return <>{children}</>;

  return (
    <div className="flex" style={{ minHeight: "calc(100vh - 56px)" }}>
      <Sidebar role={user?.role ?? "operator"} department={user?.department} />
      <main
        className="flex-1 min-w-0 overflow-x-hidden"
        style={{ background: "var(--color-anu-void)" }}
      >
        {children}
      </main>
    </div>
  );
}
