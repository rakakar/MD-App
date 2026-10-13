"use client";

import { useCallback, useEffect, useState } from "react";
import { listInbox, markAllRead, markRead, onInboxChange, type InboxItem } from "@/lib/inbox";

/**
 * The inbox, live. Every badge and list reads it through this, and each stays
 * in step through `onInboxChange` — a push the worker keeps, or a row marked
 * read in another tab, shows everywhere without anyone polling.
 */
export function useInbox() {
  const [items, setItems] = useState<InboxItem[] | null>(null);

  const refresh = useCallback(() => {
    void listInbox().then(setItems);
  }, []);

  useEffect(() => {
    refresh();
    return onInboxChange(refresh);
  }, [refresh]);

  const unread = items?.filter((i) => !i.read).length ?? 0;

  return {
    /** `null` until the store has been read */
    items,
    unread,
    markRead: useCallback(
      (id: string) => {
        setItems((all) => all?.map((i) => (i.id === id ? { ...i, read: true } : i)) ?? all);
        void markRead(id);
      },
      []
    ),
    markAllRead: useCallback(() => {
      setItems((all) => all?.map((i) => ({ ...i, read: true })) ?? all);
      void markAllRead();
    }, []),
  };
}
