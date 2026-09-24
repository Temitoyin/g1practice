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
assets/signs/       24 sign images (23 SVG, 1 PNG)
build-artifact.mjs  bundles the app into dist/artifact.html
reference/          the original Claude Design file
```

`build-artifact.mjs` inlines the CSS and JS into a single `dist/artifact.html`
for publishing the app as a Claude Artifact. It is not part of the website and
`dist/` is gitignored.

## The question bank

122 questions, each `{ id, cat, q, img?, o: [4 strings], a: 0-3 }`:

| Category  | Count | Notes                                  |
|-----------|-------|----------------------------------------|
| `signs`   | 24    | each has an `img` under `assets/signs/` |
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

## References

The app links out to the Official MTO Driver's Handbook, which is the source
every answer in this bank was checked against:

| Chapter | Covers |
|---------|--------|
| [Signs](https://www.ontario.ca/document/official-mto-drivers-handbook/signs) | Every sign in this app, with the official wording |
| [Driving along](https://www.ontario.ca/document/official-mto-drivers-handbook/driving-along) | Right-of-way, turns, following distance |
| [Safe and responsible driving](https://www.ontario.ca/document/official-mto-drivers-handbook/safe-and-responsible-driving) | Speed, alcohol, sharing the road |
| [Keeping your driver's licence](https://www.ontario.ca/document/official-mto-drivers-handbook/keeping-your-drivers-licence) | Demerit points, suspensions, renewals |
| [Dealing with emergencies](https://www.ontario.ca/document/official-mto-drivers-handbook/dealing-emergencies) | Collisions, breakdowns, when to call police |
| [Sample knowledge test](https://www.ontario.ca/document/official-mto-drivers-handbook/test-yourself-sample-knowledge-test-questions) | The ministry's own practice questions |

They appear in three places: a Reference block on the home screen, a "Look it
up" link in the practice feedback that points at the chapter for that
question's category (`CHAPTER` in `app.js`), and a footnote under the list of
missed questions on the results screen.

## Sign artwork

23 of the 24 sign images are SVG, so they stay sharp at any size.

**17 are the official Ontario signs**, from Wikimedia Commons under their own
sign codes — Ra-001 (stop), Ra-002 (yield), Rb-016 (no U-turn), Rb-019 (do not
enter), Rb-025-R (keep right of island), Rb-055-L-R (no stopping), Wa-6R,
Wa-8R, Wa-21, Wa-22, Wa-23R, Wa-28, Wa-34, Wb-001, Wb-102A, Wc-001, Wc-4 and
Wc-5. All are public domain with no attribution required.

**Six are drawn in-house** because they are not road signs: the three
hand-signal illustrations (`s27`–`s29`), the slow-moving-vehicle emblem (`s3`)
and the destination board (`s7`).

**One is still the original PNG.** `s25` matches the handbook's "Construction
work one kilometre ahead" exactly, but no scalable version carries the "1 km"
the question depends on.

### Why not just use the handbook's images?

The handbook does contain artwork for some of these, but it cannot be used:

- The hand signals are one diagram (`2-8.jpg`, *Driving along*) with each panel
  captioned "Left Turn", "Right Turn", "Slowing Down OR Stopping". Used whole it
  gives away every answer; cropping the captions off is a modification.
- Ontario's copyright terms allow reproduction "for non-commercial purposes **if
  no changes are made to the original content**", with credit and Crown
  copyright acknowledged. Commercial use needs a licence from the King's
  Printer.

So the in-house drawings are the licensing-safe option as well as the sharper
one. They were checked against `2-8.jpg` for accuracy: arm straight out with the
left indicator lit, arm bent up at the elbow with the right indicator, arm out
and down with both brake lights.

### How the sign meanings were checked

ontario.ca puts each sign's caption **before** its image in the DOM, not after.
Matching them the other way round silently shifts every caption by one sign. The
pairings were built by walking the page structure and taking the paragraph that
*precedes* each image, then confirmed against three signs whose meaning is
unmistakable (stop, yield, railway crossing). Re-derive them the same way before
changing any sign, and check the new image against the question's answer — not
just against the sign it replaces.

### Questions that were removed

`s1` and `s14` were dropped because no official artwork could be found for
either. `s1` showed a green circle containing a right-turn arrow, which has no
equivalent in the current Ontario sign set — the handbook's green-circle
examples are bicycle route, parking and snowmobiles. `s14` showed a school bus
stop arm, which appears in the handbook only as part of a wider scene, never on
its own.

## Known limits

- The bank has only 24 sign questions, so a 20-question signs section repeats
  most of them between attempts. Add more sign questions to fix it.
- Questions have no explanation field — a wrong answer shows the correct option
  but not the reasoning.
- Single theme by design: the warm cream palette is the app's identity, so it
  does not follow the OS dark-mode setting.
- `s25` still uses a low-resolution PNG (see Sign artwork above).

## Note on the question source

The questions were transcribed from a third-party G1 study PDF. That PDF is kept
locally under `reference/` but is gitignored rather than redistributed from this
public repo. If you plan to publish this more widely, confirm the question
wording is yours to use.

## Origin

Ported from a Claude Design prototype (`reference/original-design.dc.html`),
which ran on the proprietary `<x-dc>` / `DCLogic` runtime. Screens, palette,
copy and state machine are unchanged; the runtime is plain DOM.
