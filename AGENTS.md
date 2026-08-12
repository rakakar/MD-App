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

The designer's finished Originals screens (`design_docs/screens/originals-2026-08-11`,
25 PNGs, 3x) are the source of truth for how this app looks. Deviating from them is
allowed and sometimes required — accessibility outranks the comp — but a deviation goes
in the code where it happens *and* in that file's deviations table. `docs/README.md` says
which doc owns what.

**Open the PNG before saying anything is blocked on the backend.** This has cost real
work once: a note in the code said the book hero had no headphones button because the BE
carried no link from a book to its discourse audio. The comps put no audio control on
that hero at all — listening is a chapter action, on the reader's bottom bar, and it
already worked. The claim came from an older spec that the comps had since replaced.
`PRD_v2.md` and the older specs describe intent, not the current screens; where they
disagree with a PNG, the PNG wins.

# Before you run a build

`npm run build` prerenders every chapter of every book, which is hundreds of requests at
the API in one burst. **Never point it at the production backend.** Doing that twice got
this machine refused by the server while the deployed app kept serving fine. Verify
against a local backend instead — set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1/`
in `.env.local`, run the BE (`uv run manage.py runserver`, migrate first), build, then put
`.env.local` back.
