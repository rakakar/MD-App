<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Before you style anything

Read **`docs/design-system.md`** and open **`/design`** (dev only). Colours, radii,
shadows and type steps are tokens in `src/app/globals.css`; shared components live in
`src/components/ui/`. A literal hex or a one-off `rounded-[18px]` in a component is the
bug that file exists to prevent — it has already happened once, and the fix cost a
five-hue table that could not follow a theme.

The designer's finished Originals screens (25 PNGs, 3x, 2026-08-11) are the source of
truth for how this app looks. Deviating from them is allowed and sometimes required —
accessibility outranks the comp — but a deviation goes in the code where it happens *and*
in that file's deviations table. `docs/README.md` says which doc owns what.
