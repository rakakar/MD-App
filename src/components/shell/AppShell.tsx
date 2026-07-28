"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { PlayerBar } from "@/components/player/PlayerBar";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { isReaderRoute } from "@/lib/routes";
import { Header } from "./Header";
import { BottomNav, Sidebar } from "./Nav";
import { ServiceWorker } from "./ServiceWorker";
import { WorkspaceProvider } from "./WorkspaceProvider";

function CommandK() {
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/search");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  // auth screens are neutral chrome (PRD §4)
  const neutral = pathname === "/login" || pathname === "/signup";
  // the reader owns the viewport: it has its own back, contents and settings,
  // and app chrome on top of it costs a quarter of a phone screen
  const reader = isReaderRoute(pathname);
  const bare = neutral || reader;

  return (
    <AuthProvider>
      <WorkspaceProvider>
        <PlayerProvider>
          {!bare && <Header />}
          {!bare && <Sidebar />}
          <CommandK />
          <ServiceWorker />
          <main
            className={
              bare
                ? "min-h-dvh"
                : // clears the bottom nav plus the home-indicator inset
                  "min-h-dvh pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-8 lg:pl-60"
            }
          >
            {children}
          </main>
          <PlayerBar />
          {!bare && <BottomNav />}
          {!reader && <ConsentBanner />}
        </PlayerProvider>
      </WorkspaceProvider>
    </AuthProvider>
  );
}
