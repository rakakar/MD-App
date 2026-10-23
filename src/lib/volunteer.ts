// Connect → Volunteer. The copy and the form live here rather than on the BE:
// the sign-up is a Google Form the volunteer group runs themselves, and the
// list of areas changes when the form does, not when a manager edits a panel.

/** the group's Google Form, in its embeddable form (`?embedded=true`) */
export const VOLUNTEER_FORM_EMBED =
  "https://docs.google.com/forms/d/e/1FAIpQLSeC17vxy_bBRYgpb8c-6T7-Ix7EgpYuIX0MNGfJI35quHDvgA/viewform?embedded=true";

/** the same form on Google's own page — the fallback if the embed will not load */
export const VOLUNTEER_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSeC17vxy_bBRYgpb8c-6T7-Ix7EgpYuIX0MNGfJI35quHDvgA/viewform";

export const VOLUNTEER_AREAS = [
  "Hindi Proof reading",
  "Hindi Typing (Using Voice or manually)",
  "Audio editing",
  "Audio & Video editing and publishing on You Tube or likewise",
  "Support in Sammelan Activities and other Lokvyapikaran Activities",
  "CVMS Curriculum Books development",
  "MD Research/Shodh Activities & Paper Writing",
  "Software usage for file conversion and uploading/downloading",
  "IT, AI, Platforms Website Developments Maintenance",
  "Any other ways you can be helpful",
] as const;
