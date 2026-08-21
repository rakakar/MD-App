import { permanentRedirect } from "next/navigation";

/**
 * Moved to `/feedback`, for the reason `/me/settings` moved to `/settings`.
 *
 * `/me/*` is the My Journey workspace, so opening "My feedback" from the
 * account menu swapped the switcher to My Journey, turned the accent gold and
 * put Overview · Saved · Notes in the tab bar. What a reader has reported
 * about the app is not part of their study: the journey is the reading, and
 * this is the app answering for itself.
 *
 * Permanent, like its neighbour — a canonical-URL change, and a path a sign-in
 * link may still carry as `?next=`.
 */
export default function MeFeedbackRedirect() {
  permanentRedirect("/feedback");
}
