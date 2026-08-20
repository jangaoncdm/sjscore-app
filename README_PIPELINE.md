# Using Claude Code on this project

    cd sjscore-app
    claude

Claude Code reads `CLAUDE.md` on every session — architecture, the rules that
were paid for in production, and the house style. Read `HANDOFF.md` for what is
live and what is waiting.

## The loop

    npm test                 # 391 assertions against the real backend files
    git add -A
    git commit -m "..."
    git push

The push triggers `.github/workflows/deploy.yml`, which runs the same suite,
refuses any commit carrying a real salt or API key, publishes the app and
console (never touching `config.js`), and — once the clasp credential exists —
pushes and deploys the backend, then calls `?op=diag` to confirm the district
answered.

Ask Claude Code to do the whole thing in one go:

> Fix X. Run npm test. If it is green, commit and push.

## Cutting a release

    npm version 6.9.2 --no-git-tag-version   # or edit package.json
    # bump APP_VERSION in app/app.js and CACHE in app/sw.js to match
    # bump the stamp in Code.gs if the backend changed
    npm test && git commit -am "6.9.2: ..." && git push

Those three version strings should always agree. `APP_VERSION` shows on the
app's More screen and is how you tell whether a publish reached the phones;
`CACHE` is what makes the service worker fetch the new files at all — if you
forget it, officers keep running the old app and you will spend an evening
wondering why a fix did nothing.

## Do not

- Edit the root `index.html`, `app.js`, `sw.js`, `dashboard.html`. Those are
  published copies; the Action overwrites them. Edit `app/`.
- Commit `config.js` changes casually — it holds the district's `/exec`
  address and nothing else should touch it.
- Run anything in `Admin.gs` from a script. Those alter the district's records
  and the Collector presses that button.
