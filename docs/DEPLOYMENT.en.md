# Deployment

[中文](./DEPLOYMENT.md)

The build output is a static site (`dist/`), deployed as a Cloudflare Pages project named `temp-email-web` (see
`wrangler.jsonc`).

API requests are **same-origin**: Pages Functions (`functions/_middleware.js`) forward `/api/`, `/open_api/`,
`/user_api/`, `/admin/` and the other backend paths to the backend Worker through a service binding, and every other
path is served as a static file. As a result:
- no backend URL needs to be configured;
- there are no cross-origin requests;
- the backend needs no changes.

`public/_routes.json` limits Functions to those backend paths, so static files don't count against the Functions
request quota.

There are two ways to deploy. **Use only one of them**:

| | A: GitHub Actions | B: Cloudflare Pages connected repository |
|---|---|---|
| Deploys when | After a fork syncs, a `v*` tag is pushed, or on a manual run | Every push to `main` |
| Configured in | GitHub repository secrets | The Pages project's build settings in Cloudflare |
| Best for | Regular releases from a fork (current setup) | Shipping every push, with preview URLs for other branches |

## Before you start

1. A deployed cloudflare_temp_email backend (this frontend targets v1.15.0) in **the same Cloudflare account** as the
   Pages project.
2. Check the backend Worker's name (`name` in the backend's `wrangler.toml`, `cloudflare_temp_email` by default). It
   must match `service` under `services` in `wrangler.jsonc`; edit `wrangler.jsonc` if it doesn't.
3. Optional build variables:
   - `VITE_DEFAULT_LANG`: the default language, `zh` or `en`.
   - `VITE_API_BASE`: normally **leave it unset**. Set it only to skip the service binding and have the pages call a
     backend URL cross-origin.

## A: GitHub Actions

### First-time setup

1. Create a Cloudflare API token: *My Profile* → *API Tokens* → *Create Token* → *Create Custom Token*.
   - Grant **Account → Cloudflare Pages → Edit**.
   - A token from the *Edit Cloudflare Workers* template also works if it includes that permission; add it if it
     doesn't. You can edit an existing token's permissions without changing its value.
   - Also note your account ID (shown on the *Workers & Pages* overview page).
2. In the GitHub repository, *Settings* → *Secrets and variables* → *Actions*, add:

   | Type | Name | Value |
   |---|---|---|
   | Secret | `CLOUDFLARE_API_TOKEN` | The token from step 1 |
   | Secret | `CLOUDFLARE_ACCOUNT_ID` | Your account ID |

   If you added the variable `VITE_API_BASE` for the earlier Worker deployment, delete it; otherwise the pages keep
   calling the backend cross-origin.

If the Pages project does not exist yet, the first *Deploy* run creates it (production branch `main`). Every run
deploys to production.

### Release

As upstream does, a push to `main` does not deploy. *Deploy* runs in three cases:

- **After a fork syncs** (current setup): the fork deploys after each successful weekly sync. To ship right away, run
  *Upstream Sync* by hand from the fork's *Actions* tab. See [Deploying from a fork](#deploying-from-a-fork).
- **Manual run**: *Actions* → *Deploy* → *Run workflow*, then pick a branch or tag.
- **Tag**: for marking a release. Bump the version first (the `/about` page shows it as the frontend version), then
  push the tag to the repository that deploys:

  ```bash
  npm version 0.2.0 --no-git-tag-version   # only edits package.json
  git commit -am "chore: release v0.2.0"
  git push origin main
  git tag v0.2.0
  git push origin v0.2.0                    # when deploying from a fork, push to the fork's remote
  ```

Every deployment adds an entry to the Pages project's *Deployments*. Its message is the tag or branch that triggered
it, and its commit hash identifies the deployed code.

### Roll back

Find an earlier production deployment under the Pages project → *Deployments* and choose *Rollback to this
deployment*; it takes effect immediately. Or run *Deploy* by hand on an older tag.

## B: Cloudflare Pages connected repository

### First-time setup

1. *Workers & Pages* → *Create application*, click *Looking to deploy Pages?* at the bottom of the page →
   *Import an existing Git repository*, authorise GitHub and pick this repository.
2. Fill in:

   | Setting | Value |
   |---|---|
   | Project name | `temp-email-web` (matches `name` in `wrangler.jsonc`) |
   | Production branch | `main` |
   | Framework preset | `None` |
   | Build command | `pnpm run build` |
   | Build output directory | `dist` |
   | Environment variables | `PNPM_VERSION` = `11.14.0` (matches `packageManager` in `package.json`) |

   - Node comes from the repository's `.node-version`.
   - The service binding is read from `wrangler.jsonc`; nothing to configure in the dashboard.
3. Disable method A in the GitHub repository: *Actions* → *Deploy* → `···` → *Disable workflow*, so tags don't deploy
   a second time.

### Day to day

- Pushes to `main` build and go live.
- Pushes to other branches get preview URLs (`<branch>.temp-email-web.pages.dev`); turn that off under *Settings* →
  *Builds* → *Branch control* if you don't need it.
- **Roll back**: pick an earlier production deployment under the Pages project → *Deployments*.

## After deploying

- **API reachable**: open `https://<frontend domain>/open_api/settings`; it should return JSON. If you get a 404, a
  500 or the page's HTML, see [Troubleshooting](#troubleshooting).
- **Open the site**: the landing page should show the site title and mail domains configured on the backend.
- **Custom domain**: Pages project → *Custom domains* → *Set up a custom domain*.
- **Backend `FRONTEND_URL`**: set it to the frontend URL; mail links in webhook payloads are built from it.
- **Turnstile**: if the backend uses it, add the frontend domain to the Turnstile widget's hostname list.
- **OAuth2**: the redirect URL is `https://<frontend domain>/user/oauth2/callback`. Update it in the admin console's
  *OAuth2* settings and with each provider.
- **Telegram Mini App**: needs its own build, deployed to a separate Pages project; then enter its URL in the admin
  console's *Telegram* settings:

  ```bash
  pnpm build:telegram
  npx wrangler pages project create temp-email-web-telegram --production-branch main   # first time only
  npx wrangler pages deploy --project-name temp-email-web-telegram --branch main
  ```

## Migrating from the old frontend

- Deployed on **the old frontend's domain**, users stay signed in (browser storage uses the same keys). On a new domain
  they have to sign in again and re-register passkeys.
- **The old frontend is a Pages project**: remove the domain from the old project first, then add it to the
  `temp-email-web` project.
- **This frontend was previously deployed as a Worker with static assets**:
  1. Make sure the new Pages site works.
  2. Remove the custom domain from the `temp-email-web` Worker (*Settings* → *Domains & Routes*) and add it to the
     Pages project.
  3. Delete the Worker.

  Note that `*.workers.dev` and `*.pages.dev` are different origins: if you use those addresses directly, sign-ins
  don't carry over between them.
- `?jwt=` and `?mail_id=` links, `/admin` (redirects to `/console`) and legacy `/zh/...`, `/en/...` URLs keep working.

## Deploying from a fork

In a fork, *Upstream Sync* (`.github/workflows/sync.yaml`) syncs `main` from `berry-shake/temp-email-web` every Monday
at 00:00 UTC, or on demand from the *Actions* tab. Both the sync and the deployment that follows it only run in forks;
the source repository is not affected.

- The first time, click **Sync fork** on the fork's GitHub page so the workflow itself reaches the fork.
- Method A: *Deploy* runs after every successful sync. Without new commits it redeploys the same code, which is
  harmless. A failed sync does not deploy.
- Method B: Cloudflare builds once the sync updates `main`.
- Tags from the source repository are not copied.
- The default token cannot sync changes to files under `.github/workflows/`. For those, add the fork secret
  `UPSTREAM_SYNC_TOKEN`: a personal access token with the `repo` and `workflow` scopes.
- If the fork's `main` has its own commits that conflict with the source, the sync fails and must be resolved by hand.

## Troubleshooting

**The site opens but settings fail to load.**
Open `https://<frontend domain>/open_api/settings` and check the response:
- The page's HTML: `_routes.json` didn't take effect; make sure `dist/` contains `_routes.json`.
- A 500 or a "service not found" error: the service binding can't reach the backend. Check the backend Worker name in
  `wrangler.jsonc` and that it is in the same account as the Pages project.
- Requests go to another domain: `VITE_API_BASE` was set at build time; remove it and redeploy.

**I use method A, but every push deploys.**
The Pages project is connected to the Git repository (method B). Turn off automatic deployments under the Pages
project → *Settings* → *Builds* → *Branch control*, or use a new project name.

**Actions fails at Check configuration.**
A secret is missing; the log lists which one.

**Actions fails at Create Pages project or Deploy with an authentication error.**
The token lacks *Cloudflare Pages: Edit*, or the account ID is wrong.

**The deployment succeeded, but the site still shows the old version.**
It went to a preview environment. Method A always deploys to `main`, so the Pages project's production branch must be
`main` too (*Settings* → *Builds* → *Branch control*).

## Other ways to deploy

<details>
<summary>Worker with static assets, served by the backend Worker, any static host</summary>

- **Worker with static assets**: replace `wrangler.jsonc` with a Worker config whose `assets` points at `./dist`, with
  `not_found_handling: "single-page-application"`. The version in commit `41fcaaa` is a starting point.
  - Functions don't run in this setup, so the pages call the backend cross-origin and `VITE_API_BASE` must be set at
    build time.
  - Deploy with `npx wrangler deploy`.
- **Served by the backend Worker**: in the backend's `wrangler.toml`, point `[assets]` `directory` at this repository's
  `dist/` (`binding = "ASSETS"`, `run_worker_first = true`) and leave `VITE_API_BASE` empty.
- **Any static host**: serve `dist/` with unknown paths falling back to `index.html`; the API is then called
  cross-origin. Set the backend URL at build time with `VITE_API_BASE`, or after the build in `dist/index.html`:
  `<script id="app-config" type="application/json">{"API_BASE":"https://mail-api.example.com"}</script>`.

</details>
