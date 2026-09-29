# Bay Compassion redirector

Minimal static redirect site for `go.thebaycompassion.org`, hosted on Netlify.
No dependencies or build command are needed.

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

Run the same check locally with Python 3.11 or newer:

```sh
python3 scripts/validate.py
```

Rules currently support three fields only, with literal paths such as
`/food-market` and external HTTPS destinations. Expand the validator if advanced
Netlify rules are needed. CI checks configuration without contacting destination
sites; it does not deploy or gate Netlify's automatic deployments.
