import { permanentRedirect } from "next/navigation";

/**
 * Settings used to live here, and the address is the whole reason it moved.
 *
 * `/me/*` is the My Journey workspace — `workspaceForPath` hands every path
 * under it that workspace's chrome — so opening Settings swapped the switcher
 * to "My Journey", turned the accent gold and replaced the tab bar with
 * Overview · Saved · Notes. Changing a password moved the reader into a
 * content workspace they had not asked for and left them to find their own way
 * back.
 *
 * Settings is not part of anyone's journey: it is the account, the theme, what
 * has been downloaded and what is shared. Those belong to the app, so they now
 * sit at `/settings`, which no workspace claims — open it from Originals and
 * Originals is still what the chrome says you are in.
 *
 * Permanent rather than a plain redirect: this is a canonical-URL change, not a
 * condition that might reverse, and the old path is one a reader may have
 * bookmarked or a sign-in link may still carry as `?next=`.
 */
export default function MeSettingsRedirect() {
  permanentRedirect("/settings");
}
