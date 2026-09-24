# G1 Practice

Study app for the Ontario G1 written test: flashcards, practice questions, and a
full 40-question mock exam. Mobile-first, works offline, no build step.

**Live:** https://temitoyin.github.io/g1practice/

## Run it

Any static server will do:

```
npx serve .
```

Then open the printed URL. (Opening `index.html` directly from disk also works —
there are no ES modules or `fetch` calls.)

## Deploying

GitHub Pages serves `main` from the repository root, so **pushing to `main`
deploys**. There is no build step and no CI — the files in the repo are the
files that ship. `.nojekyll` stops Pages from reprocessing anything.

Every asset path is relative, which is what lets the same files work at the
`/g1practice/` subpath, at a custom domain, and from disk.

## Layout

```
index.html          markup shell
styles.css          design tokens + every component class
app.js              state machine and views
data/questions.js   the 124-question bank (sets window.G1_QUESTIONS)
assets/signs/       26 sign images (24 SVG, 2 PNG)
build-artifact.mjs  bundles the app into dist/artifact.html
reference/          the original Claude Design file
```

`build-artifact.mjs` inlines the CSS and JS into a single `dist/artifact.html`
for publishing the app as a Claude Artifact. It is not part of the website and
`dist/` is gitignored.

## The question bank

124 questions, each `{ id, cat, q, img?, o: [4 strings], a: 0-3 }`:

| Category  | Count | Notes                                  |
|-----------|-------|----------------------------------------|
| `signs`   | 26    | each has an `img` under `assets/signs/` |
| `rules`   | 77    | road rules, no images                   |
| `licence` | 21    | licensing, demerit points, penalties    |

To add questions, append to the array in `data/questions.js`. Ids must be unique;
`a` is the index of the correct option.

## Modes

- **Flashcards** — flip, then sort into "Got it" or "Still learning".
- **Practice** — answer, get the verdict immediately, loops indefinitely.
- **Quick quiz** — 10 questions from the selected topic, scored at the end.
- **Mock G1** — 20 signs + 20 rules, like the real exam. Pass is 16/20 in *each*
  part, so 32/40 split evenly passes but 35/40 lopsided does not.

Topic filters (All / Signs / Rules / Licence & penalties / Missed) apply to
flashcards, practice and the quick quiz. The mock test always draws from the
whole bank. Note that "Rules" covers everything that isn't a sign, so it
includes the licence questions; "Licence & penalties" narrows to just those.

## Progress

Saved to `localStorage` under `g1prac_v1`:

```js
{ mastered: [ids], missed: [ids], best: <best mock score or null> }
```

Answering correctly moves a question into `mastered`; missing it moves it into
`missed`, which is what the "Missed" topic filter and the "To review" count read.
Every read and write is wrapped in try/catch, so blocked storage degrades to an
in-memory session rather than a broken page.

## Tuning

`CONFIG` at the top of `app.js`:

| Key            | Default | Meaning                                 |
|----------------|---------|-----------------------------------------|
| `shuffle`      | `true`  | randomize deck order                    |
| `quickLength`  | `10`    | questions in a quick quiz               |
| `mockPerPart`  | `20`    | signs and rules per mock test           |
| `mockPassMark` | `16`    | correct answers needed in each part      |

## Sign artwork

24 of the 26 sign images are SVG, so they stay sharp at any size and on any
display.

**18 are the official Ontario signs**, taken from Wikimedia Commons under their
own sign codes — Ra-001 (stop), Ra-002 (yield), Rb-016 (no U-turn), Rb-019 (do
not enter), Rb-025-R (keep right of island), Rb-055-L-R (no stopping), Wa-6R,
Wa-8R, Wa-21, Wa-22, Wa-23R, Wa-24, Wa-34, Wb-001, Wb-102A, Wc-001, Wc-4 and
Wc-5. All are public domain with no attribution required.

**Six are drawn in-house** because they are not road signs and have no official
SVG: the three hand-signal illustrations (`s27`–`s29`), the slow-moving-vehicle
emblem (`s3`), the school bus stop arm (`s14`) and the destination board (`s7`).

**Two are still the original PNGs.** `s1`'s green circle with a right-turn arrow
has no equivalent in the current Ontario sign set, and no official artwork
matches `s25`'s "CONSTRUCTION 1 km" wording — the closest says "CONSTRUCTION
ENDS", which would contradict the question. Both are low-resolution and would
benefit from better source art.

## Known limits

- The bank has only 26 sign questions, so a 20-question signs section repeats
  most of them between attempts. Add more sign questions to fix it.
- Questions have no explanation field — a wrong answer shows the correct option
  but not the reasoning.
- Single theme by design: the warm cream palette is the app's identity, so it
  does not follow the OS dark-mode setting.
- `s1` and `s25` still use low-resolution PNGs (see Sign artwork above).

## Note on the question source

The questions were transcribed from a third-party G1 study PDF. That PDF is kept
locally under `reference/` but is gitignored rather than redistributed from this
public repo. If you plan to publish this more widely, confirm the question
wording is yours to use.

## Origin

Ported from a Claude Design prototype (`reference/original-design.dc.html`),
which ran on the proprietary `<x-dc>` / `DCLogic` runtime. Screens, palette,
copy and state machine are unchanged; the runtime is plain DOM.
