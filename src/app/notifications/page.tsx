"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { NotificationList } from "@/components/notifications/NotificationList";
import { useInbox } from "@/components/notifications/useInbox";
import { BackIcon } from "@/components/shell/icons";
import { AppAccent } from "@/components/shell/WorkspaceProvider";
import { PageContainer, ctaPrimary } from "@/components/ui";
import { signInHref } from "@/lib/routes";

/**
 * **Notifications** — the phone's screen for the inbox (designer's comp,
 * 13 Oct 2026). Reached from the account sheet's Notifications row; on a
 * desktop the bell in the sidebar opens the same list in a panel, and this
 * page is where its account-menu row lands.
 *
 * Back rather than a tab: it belongs to no workspace, and the reader came
 * from wherever they were.
 */
export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { unread, markAllRead } = useInbox();

  return (
    <AppAccent>
      <PageContainer>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Back"
            onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
            className="-ms-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink transition-colors active:bg-ink/5"
          >
            <BackIcon className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 flex-1 font-display text-2xl font-medium">Notifications</h1>
          {user && unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="min-h-11 shrink-0 px-1 text-sm font-semibold"
              style={{ color: "var(--ws-ink)" }}
            >
              Mark all read
            </button>
          )}
        </div>
        {/* Signed-in readers only, as the doors to it are — this covers a
            link followed while signed out. */}
        {loading ? null : user ? (
          <div className="mt-4">
            <NotificationList />
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-rule bg-card p-4">
            <p className="text-sm text-ink-soft">Sign in to see your notifications.</p>
            <Link
              href={signInHref("/notifications")}
              className={`mt-3 ${ctaPrimary}`}
              style={{ background: "var(--ws-color)" }}
            >
              Sign in
            </Link>
          </div>
        )}
      </PageContainer>
    </AppAccent>
  );
}
