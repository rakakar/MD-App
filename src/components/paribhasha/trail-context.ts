"use client";

import { createContext, useContext } from "react";

export interface TrailValue {
  /** open a headword, pushing it onto the trail */
  open: (word: string) => void;
}

/**
 * Its own module so the provider and the marked-up text can both reach it
 * without importing each other — the sheet renders definitions, and those
 * definitions open the sheet.
 */
export const TrailContext = createContext<TrailValue>({ open: () => {} });

export function useWordTrail(): TrailValue {
  return useContext(TrailContext);
}
