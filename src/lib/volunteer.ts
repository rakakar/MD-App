// Connect → Volunteer. The form lives here rather than on the BE: the sign-up
// is a Google Form the volunteer group runs themselves.

/** the group's Google Form, in its embeddable form (`?embedded=true`) */
export const VOLUNTEER_FORM_EMBED =
  "https://docs.google.com/forms/d/e/1FAIpQLSeC17vxy_bBRYgpb8c-6T7-Ix7EgpYuIX0MNGfJI35quHDvgA/viewform?embedded=true";

/** the same form on Google's own page — the fallback if the embed will not load */
export const VOLUNTEER_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSeC17vxy_bBRYgpb8c-6T7-Ix7EgpYuIX0MNGfJI35quHDvgA/viewform";
