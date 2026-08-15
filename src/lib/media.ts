/**
 * The picture a recording wears where it has none of its own.
 *
 * A video row carries a still from the video, which is the thing that tells
 * one part of a sammelan from the next before a word is read. Audio has no
 * frame to show, and a list of fourteen glyph tiles was fourteen identical
 * marks in a column — so the audio rows and the resume cards share one
 * portrait of Shri A. Nagraj instead. It is not identification, since every
 * recording here is him; it is the same weight of ink beside the title, so
 * the audio list and the video list read as one kind of list.
 *
 * One constant because it is one decision: swapping the portrait is this line,
 * not a hunt through two components.
 *
 * Served from `public/`, so it is a plain URL rather than an import — the
 * `<img>` tags that use it fall back to their kind glyph if the file is not
 * there, which is what makes it safe to reference before it is added.
 */
export const AUDIO_POSTER = "/audio-cover.jpg";
