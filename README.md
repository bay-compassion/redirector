# Bay Compassion redirector

Minimal static redirect site for `go.thebaycompassion.org`, hosted on Netlify.
No package installation or build command is needed.

## Redirects

Edit `public/_redirects`. Each active line contains a source path, a full
destination URL, and a status code:

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
This redirects to the app with:

```text
utm_source=printed_flyer&utm_medium=offline&utm_campaign=food_market
```

This keeps flyer attribution separate from printed cards. Select
**Food market · printed flyers** in the QR generator to download the flyer code.

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

## CI

GitHub Actions validates the site on pushes to `main`, every pull request, and
manual runs. It checks the Netlify publish directory, the fallback page, and
redirect rules (explicit paths, duplicate paths, HTTPS destinations, redirect
status codes, and destinations pointing back to this redirector).

The validator is JavaScript using only Node.js built-ins. No package installation
is needed. CI uses Node.js 24, recorded in `.nvmrc`.
Run the same checks locally:

```sh
node --test scripts/validate.test.mjs
node scripts/validate.mjs
```

Rules currently support three fields only, with literal paths such as
`/food-market` and external HTTPS destinations. Expand the validator if advanced
Netlify rules are needed. CI checks configuration without contacting destination
sites; it does not deploy or gate Netlify's automatic deployments.
The configuration check accepts only the minimal `[build]` / `publish = "public"`
settings currently in `netlify.toml`; expand it before adding other Netlify settings.
