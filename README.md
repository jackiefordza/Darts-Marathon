# Burnaby Arms Darts Marathon — Live Scorer

Real-time scoreboard for the 100,001 → 0 countdown. Two teams enter scores
from their own phones; everyone (including a big viewing screen) sees updates
instantly via Firestore.

```
darts-marathon/
├── index.html          — markup only
├── css/style.css        — all styling
├── js/config.js          — your Firebase config + init (paste keys here)
├── js/app.js              — app logic
├── firestore.rules        — security rules to paste into Firebase console
└── README.md
```

## 1. Firebase project (5 min)

1. https://console.firebase.google.com → **Add project**.
2. **Build → Firestore Database → Create database** → production mode →
   pick a region near the UK (e.g. `europe-west2`).
3. **Project settings** (gear icon) → **Your apps** → **Web (`</>`)** → register
   an app (e.g. "darts-scorer") → skip Firebase Hosting.
4. Copy the `firebaseConfig` object shown.

## 2. Wire it up

Paste your config into `js/config.js`, replacing the `PASTE_ME` values.

## 3. Lock down the database

Firestore → **Rules** tab → paste in the contents of `firestore.rules` →
**Publish**. This opens read/write on just the one scoreboard document.

## 4. Push to GitHub + enable Pages

If Claude is pushing this for you: create an empty repo, generate a
fine-grained personal access token scoped to that repo with **Contents:
write** and **Pages: write**, and share the repo name + token. Claude will
push these files and turn on Pages.

Doing it yourself instead:
```bash
git init
git add .
git commit -m "Darts marathon live scorer"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```
Then in the repo: **Settings → Pages → Source: Deploy from a branch →
Branch: main / (root)** → Save. GitHub gives you a URL like
`https://<you>.github.io/<repo>/` within a minute or two.

## 5. Test before Saturday

- Open the Pages URL on two phones + a laptop.
- Log a visit on "Green Team", confirm it appears on the viewing screen and
  the other phone within a second or two.
- **Event setup → Reset** once you're happy, so the countdown starts clean
  at 100,001 on the day.

## Notes

- The timer starts automatically on the first visit logged by either team.
- "Undo last entry" only affects the most recent visit for that team.
- The Firestore rule is fully open (no auth) — fine for a friendly event with
  people you trust, just don't post the raw link publicly beyond your
  scorers and the venue screen.
