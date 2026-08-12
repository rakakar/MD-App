import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** The two shapes drift takes. Shared so the warn and error tiers below cannot
 *  disagree about what the rule actually is. */
const designSystemRules = [
  {
    // A bare hex in a component is a colour no theme can restate. Put it in
    // globals.css and read it back as var(--…) or a generated utility.
    selector:
      "Literal[value=/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]",
    message:
      "No hex literals in components — add a token to globals.css and use it. See docs/design-system.md.",
  },
  {
    // rounded-[18px] / shadow-[0_1px…] / bg-[#fff] — the arbitrary-value escape
    // hatch, which is exactly how eleven radii happened. The scale is
    // rounded-tile | -card | -hero | -sheet | -full, and the lifts are
    // shadow-card | -raised | -sheet.
    selector: "Literal[value=/(?:^|\\s)(?:rounded|shadow|bg|text|border)-\\[/]",
    message:
      "No arbitrary Tailwind colour/radius/shadow values in components — use the scale in globals.css. See docs/design-system.md.",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Post-hydration reads of localStorage/IndexedDB/session state must
      // set state inside effects to avoid SSR markup mismatches; keep the
      // signal as a warning instead of an error.
      "react-hooks/set-state-in-effect": "warn",
    },
  },

  /**
   * **The design system, enforced rather than requested.**
   *
   * `docs/design-system.md` asks nicely that colours, radii and shadows come
   * from tokens. Asking nicely is how the app ended up with eleven radii and a
   * five-hue table in `NodeCard.tsx` that was a shade off the designer's and
   * could not restate itself per theme. This is the same rule with teeth.
   *
   * **Two levels on purpose.** Turned on repo-wide as an error it reports 107
   * violations, nearly all of them older than the design system, and a lint
   * that is red on arrival is a lint everyone learns to run with `--quiet`. So
   * it is an *error* inside `components/ui/` — the system itself, where a
   * literal is a contradiction — and a *warning* in the screens, where it is a
   * backlog. A screen graduates to the error list as it is migrated; the list
   * below is the migration, visible.
   *
   * `src/app/globals.css` is the one place hexes belong, and it is not
   * JavaScript, so nothing here reaches it.
   */
  {
    files: ["src/components/**/*.{ts,tsx}"],
    ignores: [
      // The kitchen sink's whole job is showing tokens next to their names.
      "src/components/design/**",
    ],
    rules: { "no-restricted-syntax": ["warn", ...designSystemRules] },
  },
  {
    // Migrated, and held to it.
    files: [
      "src/components/ui/**/*.{ts,tsx}",
      "src/components/books/**/*.{ts,tsx}",
      // Drawn from the comps, so a literal here is a new one rather than an
      // inherited one.
      "src/components/library/FindFilters.tsx",
      // The listening surfaces, now that their fixed dark palette is the
      // `audio` token family rather than forty hexes across three files.
      "src/components/player/**/*.{ts,tsx}",
    ],
    rules: { "no-restricted-syntax": ["error", ...designSystemRules] },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
