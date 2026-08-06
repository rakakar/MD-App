"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { FeedbackProvider } from "@/components/feedback/FeedbackProvider";
import { PlayerBar } from "@/components/player/PlayerBar";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { TrackAudioMode } from "@/components/player/TrackAudioMode";
import { PushProvider } from "@/components/push/PushProvider";
import { ownsViewport } from "@/lib/routes";
import { DisplayProvider } from "./DisplayProvider";
import { Header } from "./Header";
import { BottomNav, Sidebar } from "./Nav";
import { RailProvider } from "./Rail";
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
  // a reader owns the viewport: it has its own back, contents and settings,
  // and app chrome on top of it costs a quarter of a phone screen. Both
  // readers qualify — the book's and the PDF's.
  const reader = ownsViewport(pathname);
  const bare = neutral || reader;

  return (
    // Outermost, because the theme is the one thing every screen reads —
    // including the reader, which used to own it and now only asks for it.
    <DisplayProvider>
    <AuthProvider>
      <WorkspaceProvider>
        {/* Above the router, because the screen a reader most wants to report
            from is one that has just failed to render — a sheet mounted inside
            a route could not open then. Paints nothing until it is opened. */}
        <FeedbackProvider>
        <PlayerProvider>
          {/* The rail and the route are on opposite sides of the router — the
              sidebar is mounted once here and a page's facets are fetched per
              request — so the slot that joins them has to be above both. */}
          <RailProvider>
            {!bare && <Header />}
            {!bare && <Sidebar />}
            <CommandK />
            <ServiceWorker />
            <main
              className={
                bare
                  ? "min-h-dvh"
                  : // clears the bottom nav plus the home-indicator inset
                    "min-h-dvh pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-8 lg:pl-64"
              }
            >
              {children}
            </main>
          </RailProvider>
          <PlayerBar />
          {/* Full-screen listening for anything that is not a chapter. The
              reader mounts its own Audio Mode inside itself; a recording can
              be playing from a series page, a collection or the folder tree,
              so this one lives at the top and decides for itself. */}
          <TrackAudioMode />
          {!bare && <BottomNav />}
          {!reader && <ConsentBanner />}
          {/* Outside `bare` so a notification arriving mid-chapter is still
              seen — it is the reader's own opt-in, not app chrome. */}
          <PushProvider />
        </PlayerProvider>
        </FeedbackProvider>
      </WorkspaceProvider>
    </AuthProvider>
    </DisplayProvider>
  );
}
