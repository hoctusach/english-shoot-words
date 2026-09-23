# Word Shooter (Game Bắn Từ)

A small arcade-style typing game for practicing English vocabulary. Words drift down the
screen with their Vietnamese meaning shown as a hint — type the word to "shoot" it down
before it reaches the bottom. Correct words are read aloud.

Live: https://hoctusach.github.io/english-shoot-words/

## Import

Import a `.csv` or `.xlsx` file with two columns: word, then meaning. No header row is
needed — every row is read as one word (a leading `Word,Meaning`-style header row is
skipped automatically if present). Each imported file is saved as a single word set that
you can rename afterwards from "Saved word sets".

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
