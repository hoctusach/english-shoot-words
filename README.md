# English Shoot Words

A small arcade-style typing game for practicing English vocabulary. Words drift down the
screen with their Vietnamese meaning shown as a hint — type the word to "shoot" it down
before it reaches the bottom. Correct words are read aloud.

Live: https://hoctusach.github.io/english-shoot-words/

## Import

Import the same `.xlsx` file you already use with
[lazy-vocabulary](https://github.com/hoctusach/lazy-vocabulary) — sheets named
`phrasal verbs`, `idioms`, `topic vocab`, `grammar`, `phrases, collocations` or
`word formation` (with `Word`/`Meaning` columns, or common aliases such as
`Term`/`Definition`) are detected automatically. Each detected sheet can be saved as its
own word set.

## Saved sets

Word sets are saved to the browser's `localStorage` on your device — no account, no
backend. Pick a saved set from "Saved word sets" to play it again instantly, or use the
"Continue: <set name>" shortcut on the home screen to jump back into the last one you
played.

## Development

```sh
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm run preview  # preview the production build
```

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the app and deploys
`dist/` to GitHub Pages via GitHub Actions.

**One-time setup**: in this repo's **Settings → Pages**, set **Build and deployment →
Source** to **GitHub Actions** (it defaults to "Deploy from a branch"). Without this, the
workflow builds successfully but the deploy step fails.
