"use client";

import { Inter } from "next/font/google";
import { usePathname } from "next/navigation";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Sidebar } from "@/components/Sidebar";
import { AuthProvider, useAuth } from "@/lib/auth/AuthProvider";
import { I18nProvider } from "@/lib/i18n/context";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="dark">
      <body className={inter.className}>
        <I18nProvider>
          <AuthProvider>
            <GlobalHeader />
            <AppBody>{children}</AppBody>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}

function AppBody({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isLogin = pathname === "/login";

  if (isLogin) return <>{children}</>;

  return (
    <div className="flex" style={{ minHeight: "calc(100vh - 56px)" }}>
      <Sidebar role={user?.role ?? "operator"} />
      <main
        className="flex-1 min-w-0 overflow-x-hidden"
        style={{ background: "var(--color-anu-void)" }}
      >
        {children}
      </main>
    </div>
  );
}
