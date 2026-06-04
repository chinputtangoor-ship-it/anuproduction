"use client";

import { Inter } from "next/font/google";
import { usePathname } from "next/navigation";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="dark">
      <body className={inter.className}>
        <GlobalHeader />
        <AppBody>{children}</AppBody>
      </body>
    </html>
  );
}

function AppBody({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin  = pathname === "/login";

  let role = "operator";
  if (typeof window !== "undefined") {
    try {
      const u = localStorage.getItem("anu_user");
      if (u) role = JSON.parse(u).role;
    } catch {}
  }

  if (isLogin) return <>{children}</>;

  return (
    <div className="flex" style={{ minHeight: "calc(100vh - 56px)" }}>
      <Sidebar role={role} />
      <main className="flex-1 min-w-0 overflow-x-hidden"
            style={{ background: "var(--color-anu-void)" }}>
        {children}
      </main>
    </div>
  );
}