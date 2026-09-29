"""Validate this site's explicit redirect rules using Python 3.11+ only."""

from pathlib import Path
import re
import sys
import tomllib
from urllib.parse import urlsplit


def validate(root: Path) -> int:
    with (root / "netlify.toml").open("rb") as config_file:
        config = tomllib.load(config_file)
    if config.get("build", {}).get("publish") != "public":
        raise ValueError("netlify.toml must publish the public directory")
    if config.get("redirects"):
        raise ValueError("Keep all redirect rules in public/_redirects")
    if not (root / "public/404.html").is_file():
        raise ValueError("Missing public/404.html fallback page")

    sources = set()
    for number, line in enumerate(
        (root / "public/_redirects").read_text(encoding="utf-8").splitlines(), 1
    ):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        label = f"public/_redirects:{number}"
        fields = line.split()
        if len(fields) != 3:
            raise ValueError(f"{label}: expected source, destination, and status")
        source, destination, status = fields
        # This site uses literal ministry paths, not wildcards or placeholders.
        if not re.fullmatch(r"/(?:[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*/?)?", source):
            raise ValueError(f"{label}: use a literal path such as /food-market")
        normalized = source.rstrip("/") or "/"
        if normalized in sources:
            raise ValueError(f"{label}: duplicate source path {source}")
        sources.add(normalized)

        target = urlsplit(destination)
        if (
            target.scheme != "https"
            or not target.hostname
            or target.username is not None
            or target.password is not None
        ):
            raise ValueError(f"{label}: destination must be a full HTTPS URL")
        # Accessing port also rejects malformed port values.
        _ = target.port
        if status not in {"301", "302", "307", "308"}:
            raise ValueError(f"{label}: expected status 301, 302, 307, or 308")
        if target.hostname == "go.thebaycompassion.org":
            raise ValueError(f"{label}: use an external destination to avoid redirect loops")

    if not sources:
        raise ValueError("public/_redirects must contain at least one active rule")
    return len(sources)


if __name__ == "__main__":
    try:
        count = validate(Path(__file__).resolve().parents[1])
    except (OSError, ValueError) as error:
        print(f"Validation failed: {error}", file=sys.stderr)
        sys.exit(1)
    print(f"Validated {count} redirect rules and Netlify publish configuration.")
