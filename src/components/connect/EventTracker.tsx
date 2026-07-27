"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

export function EventTracker() {
  useEffect(() => {
    track("event_view");
  }, []);
  return null;
}
