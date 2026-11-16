"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useUndoToast } from "@/components/ui";
import { removeConversation, type Conversation } from "@/lib/assistant/conversations";

/**
 * Deleting a conversation: at once, with Undo (15 Nov 2026, UX audit TR4).
 *
 * It was the browser's own "Delete …? This can't be undone." box — a
 * generic dialog the rest of the app had already replaced with the Undo
 * toast notes and highlights use, and true: nothing could bring it back. A
 * saved conversation also leaves My Journey when it goes, so the toast says
 * that too.
 */
const Ctx = createContext<(c: Conversation) => void>(() => {});

export function useDeleteConversation(): (c: Conversation) => void {
  return useContext(Ctx);
}

export function ConversationUndoProvider({ children }: { children: ReactNode }) {
  const [toast, offerUndo] = useUndoToast();
  const remove = useCallback(
    (c: Conversation) => {
      const restore = removeConversation(c.id);
      offerUndo(c.savedToJourney ? "Removed, from My Journey too" : "Conversation deleted", restore);
    },
    [offerUndo]
  );
  return (
    <Ctx.Provider value={remove}>
      {children}
      {toast}
    </Ctx.Provider>
  );
}
