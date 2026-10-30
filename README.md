# Bay Compassion redirector

Minimal static redirect site for `go.thebaycompassion.org`, hosted on Netlify.
No package installation or build command is needed.

## Redirects

Edit `public/_redirects`. Each active line contains a source path, a full
destination URL or internal path, and a status code:

```text
/food-market https://app.thebaycompassion.org 302
```

The ministry link `https://go.thebaycompassion.org/food-market` redirects to
`https://app.thebaycompassion.org` with HTTP status `302`.
The bare domain (`/`) also redirects to that destination for now; it can become
a directory of ministry links later. Use a separate descriptive path for each ministry.
Use `302` for links whose destinations may change. Add more lines for future links.
Unrecognized paths return the `public/404.html` page with a 404 status.

### Printed cards

Print or encode `https://go.thebaycompassion.org/food-market/card` on cards.
This redirects to the app with these attribution parameters:

```text
utm_source=printed_card&utm_medium=offline&utm_campaign=food_market
```

The app or its analytics must record these parameters on arrival, before login or
navigation removes them. The redirector adds the tags but does not record visits.
The general `/food-market` and `/` links do not add card attribution.
Future sources can have their own explicit paths and destination parameters.

### Printed flyers

Print or encode `https://go.thebaycompassion.org/food-market/flyer` on flyers.
The currently checked-in rule redirects to `https://app.thebaycompassion.org/holding`.
Selecting `primary` moves it to the main app; selecting `holding` sends all
food-market entry points to the holding page. Flyer attribution is retained:

```text
utm_source=printed_flyer&utm_medium=offline&utm_campaign=food_market
```

This keeps flyer attribution separate from printed cards. Select
**Food market · printed flyers** in the QR generator to download the flyer code.

### 3D-printed placards

Encode `https://go.thebaycompassion.org/food-market/placard` in the QR code on
3D-printed placards. This redirects to `https://app.thebaycompassion.org` with:

```text
utm_source=printed_placard&utm_medium=offline&utm_campaign=food_market
```

Select **Food market · 3D-printed placards** in the QR generator to download
the placard code. This keeps placard attribution separate from cards and flyers.

### QR codes

After deployment, open `https://go.thebaycompassion.org/qr/` to preview and
download a QR code as SVG (for print) or PNG (at least 1024 pixels wide).
The printed-card link is selected by default. Codes encode the permanent
`go.thebaycompassion.org` link, so you can change its destination without
reprinting the code. Generation happens in the browser using a bundled
MIT-licensed QR encoder; no external QR service is needed.

When adding a redirect, add its source path as an option in
`public/qr/index.html` to make it available in the generator.

For a local preview, serve the static folder (opening the HTML file directly
also works):

```sh
python3 -m http.server 8000 --directory public
```

Open `http://localhost:8000/qr/`. Local previews still encode the public domain.
Keep the white border around downloaded codes and scan a test print before
printing a batch.

## Deploy

1. Import this project into Netlify from a Git repository. Leave the build command
   empty; `netlify.toml` sets the publish directory to `public`.
   Alternatively, upload the `public` folder using Netlify's manual deployment.
2. Add `go.thebaycompassion.org` as a custom domain on the Netlify site.
3. Follow Netlify's domain setup instructions to configure the `go` DNS record
   with your DNS provider and enable HTTPS.
4. After deployment, check the configured link with
   `curl -I https://go.thebaycompassion.org/food-market` and confirm the status and
   `Location` header match the rule.

Netlify reference: https://docs.netlify.com/manage/routing/redirects/overview/

## Food-market failover

The backup visitor destinations are the new QRQ queue
`https://qrq.app/q/dfska9L` and the old queue `https://qrq.app/107352`.
Bookmark or encode `https://go.thebaycompassion.org/food-market/backup` for
direct access to the selected backup queue. This permanent backup link is available in the QR generator
as **Food market · backup visitor link**.

Switching modes updates `/food-market`, `/food-market/flyer`,
`/food-market/card`, `/food-market/placard`, and `/` together. QR codes keep
their permanent URLs. In either backup mode, these links redirect to
`/food-market/backup`, which redirects to the selected QRQ queue. For example:

```text
/food-market/card → /food-market/backup?utm_source=printed_card&… → QRQ
```

Printed-source UTM parameters are added on the first hop. Netlify automatically
passes query parameters through the second 302 redirect; see
[Netlify redirect options](https://docs.netlify.com/manage/routing/redirects/redirect-options/).
The backup service may not record or forward those parameters.

| Mode | Public entry points | `/food-market/backup` destination |
| --- | --- | --- |
| `primary` | Main app: `https://app.thebaycompassion.org` | New queue: `https://qrq.app/q/dfska9L` |
| `holding` | Holding page: `https://app.thebaycompassion.org/holding` | New queue: `https://qrq.app/q/dfska9L` |
| `backup` | Via `/food-market/backup` | New queue: `https://qrq.app/q/dfska9L` |
| `backup-old` | Via `/food-market/backup` | Old queue: `https://qrq.app/107352` |

Selecting `primary` or `holding` also resets the direct backup link to the new
queue. Each mode preserves the printed-source attribution. Adding these modes
does not change the checked-in redirects: run the workflow with `primary` when
ready to launch the main app, or `holding` to send all public entry points to
the holding page. No cutover is scheduled automatically.

### One-time GitHub Actions setup

1. Merge the workflow and scripts into `main`.
2. In Netlify, create a build hook for this redirector site's **main** branch.
   See [Netlify build hooks](https://docs.netlify.com/build/configure-builds/build-hooks/).
3. In GitHub → Settings → Secrets and variables → Actions, add a repository
   secret named `NETLIFY_BUILD_HOOK_URL` containing that hook URL.
4. Ensure repository rules allow this workflow's `GITHUB_TOKEN` to push to
   `main`. The workflow requests `contents: write`; branch protection may still
   block its commit. Test this setup before relying on it during an outage.

The workflow runs tests itself and explicitly requests a Netlify build, rather
than relying on a bot commit to start another workflow. GitHub does not trigger
push workflows for commits made with `GITHUB_TOKEN`.
See [GitHub workflow triggers](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).

### Switch using the button

1. Open GitHub → Actions → **Switch food-market destination** → **Run workflow**.
2. Leave the branch set to **main**. Choose **backup** for the new QRQ queue,
   **backup-old** for the old QRQ queue, **primary** for the main app, or
   **holding** for the holding page, then run the workflow.
3. Check the workflow and Netlify deployment both succeed. The workflow commits
   the selected redirects, then requests a deployment; a successful workflow
   means the deployment was requested, not that the site is already updated.
4. Check a live redirect, for example:

   ```sh
   curl -IL --max-redirs 5 https://go.thebaycompassion.org/food-market/placard
   ```

   Confirm the `Location` headers follow the expected chain and scan a QR
   code to test the visitor flow. `primary` sends every public entry point,
   including flyers, to the main app; `holding` sends them to `/holding`.

Runs are serialized to avoid competing mode switches. Selecting the current
mode again requests another deployment without making an empty commit. If the
commit succeeds but the hook fails, rerun the workflow with the same mode.
If the push fails, the workflow does not call the hook. Runs on branches other
than `main` are skipped. Keep Netlify automatic publishing enabled for the hook
deployment to become live.

### Local command

```sh
node scripts/food-market-mode.mjs backup
node scripts/food-market-mode.mjs backup-old
node scripts/food-market-mode.mjs primary
node scripts/food-market-mode.mjs holding
```

Run only the command for the mode you want. It validates and updates
`public/_redirects` locally; commit, push, and deploy to activate the change.
Normal destinations and attribution are defined in `scripts/food-market-mode.mjs`.
Update that mapping when changing a primary destination or adding another
food-market link that should switch modes, so recovery and failover continue to
cover every entry point. The separate backup-target mapping controls
`/food-market/backup`, which always reaches a QRQ queue directly.
This switch depends on GitHub and Netlify being available and does not move
visitors who have already reached the app.

## CI

GitHub Actions validates the site on pushes to `main`, every pull request, and
manual runs. It checks the Netlify publish directory, the fallback page, and
redirect rules (explicit paths, duplicate paths, HTTPS destinations, redirect
status codes, missing internal redirect targets, and redirect loops).

The validator is JavaScript using only Node.js built-ins. No package installation
is needed. CI uses Node.js 24, recorded in `.nvmrc`.
Run the same checks locally:

```sh
node --test scripts/*.test.mjs
node scripts/validate.mjs
```

Rules currently support three fields only, with literal paths such as
`/food-market`, external HTTPS destinations, and root-relative destinations
that resolve through other redirect rules. Internal chains are checked for
missing targets and cycles; absolute URLs pointing back to this redirector
remain disallowed. Expand the validator if advanced
Netlify rules are needed. CI checks configuration without contacting destination
sites; it does not deploy or gate Netlify's automatic deployments.
The configuration check accepts only the minimal `[build]` / `publish = "public"`
settings currently in `netlify.toml`; expand it before adding other Netlify settings.
