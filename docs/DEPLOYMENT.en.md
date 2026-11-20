# Deployment

[中文](./DEPLOYMENT.md)

The build output is a static site (`dist/`), deployed as a Cloudflare Worker with static assets named `temp-email-web`
(see `wrangler.jsonc`). The pages call the backend Worker cross-origin; the backend already allows CORS, so it needs no
changes.

There are two ways to deploy. **Use only one of them**:

| | A: GitHub Actions | B: Cloudflare connected repository |
|---|---|---|
| Deploys when | A `v*` tag is pushed, or on a manual run | Every push to `main` |
| Configured in | GitHub repository secrets / variables | The Worker's build settings in Cloudflare |
| Best for | Versioned releases (current setup) | Shipping every push |

## Before you start

1. A deployed cloudflare_temp_email backend (this frontend targets v1.15.0). Note its URL, e.g.
   `https://mail-api.example.com`; `curl https://mail-api.example.com/open_api/settings` should return JSON.
2. Set the build variable `VITE_API_BASE` to that URL, without a trailing `/`. Optionally set `VITE_DEFAULT_LANG`
   (`zh` or `en`) for the default language.

> Build variables are baked into the code at build time. They are not Worker runtime variables: setting them under the
> Worker's *Variables and Secrets* has no effect, and changing them needs a rebuild.

## A: GitHub Actions

### First-time setup

1. Create a Cloudflare API token: *My Profile* → *API Tokens* → *Create Token*, template **Edit Cloudflare Workers**.
   Also note your account ID (shown on the *Workers & Pages* overview page).
2. In the GitHub repository, *Settings* → *Secrets and variables* → *Actions*, add:

   | Type | Name | Value |
   |---|---|---|
   | Secret | `CLOUDFLARE_API_TOKEN` | The token from step 1 |
   | Secret | `CLOUDFLARE_ACCOUNT_ID` | Your account ID |
   | Variable | `VITE_API_BASE` | Backend URL |

3. If the Worker was ever connected to the repository (method B), disconnect it under Worker → *Settings* → *Build*,
   otherwise every push still deploys.

If the Worker does not exist yet, the first release creates it.

### Release

Bump the version first (the `/about` page shows it as the frontend version), then tag and push:

```bash
npm version 0.2.0 --no-git-tag-version
git commit -am "chore: release v0.2.0"
git tag v0.2.0
git push origin main v0.2.0
```

After the tag is pushed, *Deploy* runs under the repository's *Actions* tab. The new version in Cloudflare
(Worker → *Deployments*) is labelled with the tag.

### Redeploy and roll back

- **Redeploy** (e.g. after changing `VITE_API_BASE`): *Actions* → *Deploy* → *Run workflow*, and pick the tag to deploy.
- **Roll back**: pick an earlier version under Worker → *Deployments*; it takes effect immediately. Or run *Deploy*
  again on an older tag.

## B: Cloudflare connected repository

### First-time setup

1. *Workers & Pages* → *Create application* → *Import a repository*, authorise GitHub and pick this repository.
   For an existing Worker, use *Settings* → *Build* → *Connect*.
2. Fill in:

   | Setting | Value |
   |---|---|
   | Worker name | `temp-email-web` (must match `name` in `wrangler.jsonc`) |
   | Production branch | `main` |
   | Build command | `pnpm run build` |
   | Deploy command | `npx wrangler deploy` |
   | Build variables | `VITE_API_BASE` = backend URL |

   Put `VITE_API_BASE` under *Variables and secrets* in the build settings, not the Worker's runtime variables.
3. Disable method A in the GitHub repository: *Actions* → *Deploy* → `···` → *Disable workflow*, so tags don't deploy
   a second time.

### Day to day

- Pushes to `main` build and go live. Pushes to other branches only upload a new version without making it live; turn
  that off under *Settings* → *Build* → *Branch control* if you don't need it.
- A changed build variable takes effect after the next push, or after retrying a build from the build history.
- **Roll back**: pick an earlier version under Worker → *Deployments*.

## After deploying

- **Custom domain**: Worker → *Settings* → *Domains & Routes* → *Add* → *Custom domain*.
- **Open the site**: the landing page should show the site title and mail domains configured on the backend. If it
  fails to load them, `VITE_API_BASE` is almost certainly wrong.
- **Backend `FRONTEND_URL`**: set it to the frontend URL; mail links in webhook payloads are built from it.
- **Turnstile**: if the backend uses it, add the frontend domain to the Turnstile widget's hostname list.
- **OAuth2**: the redirect URL is `https://<frontend domain>/user/oauth2/callback`. Update it in the admin console's
  *OAuth2* settings and with each provider.
- **Telegram Mini App**: needs its own build, deployed to a separate Worker; then enter its URL in the admin console's
  *Telegram* settings:

  ```bash
  VITE_API_BASE=https://mail-api.example.com pnpm build:telegram
  npx wrangler deploy --name temp-email-web-telegram
  ```

## Migrating from the old frontend

- Deployed on **the old frontend's domain**, users stay signed in (browser storage uses the same keys). On a new domain
  they have to sign in again and re-register passkeys.
- To reuse the old domain, remove it from the old Pages project first, then add it to the `temp-email-web` Worker.
- `?jwt=` and `?mail_id=` links, `/admin` (redirects to `/console`) and legacy `/zh/...`, `/en/...` URLs keep working.

## Deploying from a fork

In a fork, *Upstream Sync* (`.github/workflows/sync.yaml`) syncs `main` from `berry-shake/temp-email-web` every Monday
at 00:00 UTC, or on demand from the *Actions* tab. It does not run in the source repository.

- The first time, click **Sync fork** on the fork's GitHub page so the workflow itself reaches the fork.
- Syncing only updates `main`: no tags, no deployment. With method A, push a tag in the fork to release; with method B,
  Cloudflare builds after each sync.
- The default token cannot sync changes to files under `.github/workflows/`. For those, add the fork secret
  `UPSTREAM_SYNC_TOKEN`: a personal access token with the `repo` and `workflow` scopes.
- If the fork's `main` has its own commits that conflict with the source, the sync fails and must be resolved by hand.

## Troubleshooting

**The site opens but settings fail to load.**
`VITE_API_BASE` was missing at build time (or set as a runtime variable), so API requests go to the frontend's own
domain. Configure it as above and rebuild.

**Every push deploys, but I only want tag releases.**
The Worker is still connected to the repository; disconnect it under Worker → *Settings* → *Build*.

**Actions fails at Check configuration.**
A secret or variable is missing; the log lists which one.

**Actions fails to deploy with an authentication error.**
The token permissions or account ID are wrong; recreate the token from the *Edit Cloudflare Workers* template.

**The connected build complains about the Worker name.**
The Worker must be named `temp-email-web`, matching `name` in `wrangler.jsonc`.

## Other ways to deploy

<details>
<summary>Cloudflare Pages on the same origin, served by the backend Worker, any static host</summary>

- **Pages on the same origin**: `pages/` is a Pages project that forwards API requests to the backend through a service
  binding. Set `service` in `pages/wrangler.toml` to the backend Worker name, leave `VITE_API_BASE` empty, then run
  `pnpm build && cd pages && npx wrangler pages deploy --branch production`.
- **Served by the backend Worker**: in the backend's `wrangler.toml`, point `[assets]` `directory` at this repository's
  `dist/` (`binding = "ASSETS"`, `run_worker_first = true`) and leave `VITE_API_BASE` empty.
- **Any static host**: serve `dist/` with unknown paths falling back to `index.html`. The API URL can also be set after
  the build in `dist/index.html`:
  `<script id="app-config" type="application/json">{"API_BASE":"https://mail-api.example.com"}</script>`.

</details>
