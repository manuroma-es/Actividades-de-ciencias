# LIVING THINGS ARE FORMED OF CELLS

Native activity `native-living-things-are-formed-of-cells`, registered through the canonical Excel workbook, in Biología y Geología / THE EARTH. Route: `/actividad/living-things-are-formed-of-cells/`. It inherits the existing Topic image and credits.

## Content

The original supplied Markdown is retained in `data/native/sources/living-things-are-formed-of-cells.md`. The JSON contains all eight questions in source order, with unchanged prompts, options and answer keys. No educational typographical corrections were made. Questions are never shuffled.

Text grading decomposes Unicode, removes combining marks, ignores case, trims surrounding whitespace and collapses repeated internal whitespace. Word boundaries remain significant. The original submitted text is retained for review; joined names and additional sentences fail.

The prescribed year 1673 and all five Q8 numerical associations are preserved. The explanation distinguishes the study material's figures from universal biological measurements; it does not change the answer key.

Explanations are local, fixed English text. Historical and cell-theory context was checked against:
- https://openstax.org/books/microbiology/pages/2-2-peering-into-the-invisible-world
- https://openstax.org/books/biology-2e/pages/4-1-studying-cells
- https://openstax.org/books/microbiology/pages/3-2-foundations-of-modern-cell-theory

## Engine extensions

The existing single-choice, multiple-choice and classification controls are reused. True/False is single-choice with `presentation: "true-false"`.

- `year`: empty numeric input, integer validation and declarative bounds; exact numeric grading.
- `text-input`: empty text input with explicit instructions and normalized comparison.
- `matching` (source terminology: **enlazar**): stable-ID `left` and `right` items plus explicit `correctMatches` map. Select a concept, then a response, using buttons with touch/keyboard support. Reassigning a used response removes its previous pairing, preserving one-to-one relationships. Review grades and explains each pair individually.

An attempt owns its randomized option/item order. Rendering and answer updates never shuffle it. Starting/repeating an attempt initializes empty answers and new arrangements through an injectable RNG. Matching avoids a completely solved initial alignment; ordering avoids its solution. Retry-only-incorrect preserves original question order.

No runtime services or network calls are added. The existing static Activity route and registry load the local JSON. Browser progress remains in memory, as in VITAL FUNCTIONS; reload starts a clean attempt.

## Verification

`tests/living-cells.test.mjs` covers exact source content, normalization, year validation, matching bijection/reassignment, deterministic shuffling, reset/retry, catalog/search/recent integration and static export. Admin tests cover both native activities as read-only.

`tests/browser/living-cells.spec.mjs` exercises correct and incorrect complete attempts, offline operation, raw text review, partial pair/category feedback, keyboard/touch, reset and retry, navigation and screenshots at desktop, iPad and mobile sizes. These are Chromium touch simulations, not a physical iPad/Safari certification.
