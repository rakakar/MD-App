/**
 * Devanagari digits. The glossary is read entirely in Hindi, and "2 परिभाषाएँ"
 * puts a Latin numeral in the middle of a Devanagari phrase — the one place in
 * this app where the count is small enough that spelling it in the same script
 * costs nothing.
 */
export function devanagariNumber(n: number): string {
  return String(n).replace(/\d/g, (d) => "०१२३४५६७८९"[Number(d)]);
}
