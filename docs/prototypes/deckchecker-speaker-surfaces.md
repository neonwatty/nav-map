# Deckchecker Speaker Prototype Surfaces

This dogfood fixture links non-live prototype references into the speaker deck workflow without
adding Deckchecker-specific behavior to nav-map core.

## Upload Deck HTML Mockup

- Surface ID: `speaker-upload-html-mockup`
- Type: `html-mockup`
- Related live route: `speaker-upload`
- Purpose: preserve the upload instructions, deck chooser, and read-only verification state before
  the live route is exercised.

## Results Review Keyframe

- Surface ID: `speaker-results-keyframe`
- Type: `keyframe`
- Related live route: `speaker-results`
- Purpose: preserve the results-review moment after deck processing completes.
