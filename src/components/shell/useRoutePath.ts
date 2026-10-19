"use client";

import { usePathname } from "next/navigation";

/**
 * `usePathname`, with the root spelled the way the rest of the app spells it.
 *
 * A prerendered `/` carries `index` as its own name — its flight data says
 * `"c":["","index"]` — and the router reports `/index` from it, on the server
 * and on the client, until the first navigation replaces it. So a fresh load
 * of Home lit no tab (every other prerendered page reads its own path and was
 * fine), and anything built from the path — a sign-in `next=` — pointed at a
 * page that does not exist. Every read of the path goes through here.
 */
export function useRoutePath(): string {
  const path = usePathname() ?? "/";
  return path === "/index" ? "/" : path;
}
