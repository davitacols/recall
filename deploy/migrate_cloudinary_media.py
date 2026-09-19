"""One-time Cloudinary-to-local media copy.

Run this through the currently deployed backend container before deploying the
filesystem-storage release:

    git show <sha>:deploy/migrate_cloudinary_media.py \
      | docker compose ... exec -T backend python manage.py shell

The current container still knows how to turn stored field names into
Cloudinary URLs, while /app/media is already the persistent media_data volume.
The script is idempotent and refuses to report success if any source cannot be
copied.
"""

import os
import shutil
from pathlib import Path

import requests
from django.conf import settings

from apps.agile.models import IssueAttachment
from apps.conversations.models import Document
from apps.organizations.models import Organization, User


MEDIA_ROOT = Path(settings.MEDIA_ROOT).resolve()
DRY_RUN = os.environ.get("MEDIA_MIGRATION_DRY_RUN") == "1"
FIELD_SOURCES = (
    ("user_avatar", User, "avatar"),
    ("organization_logo", Organization, "logo"),
    ("conversation_document", Document, "file"),
    ("issue_attachment", IssueAttachment, "file"),
)


def destination_for(name):
    destination = (MEDIA_ROOT / name).resolve()
    if destination != MEDIA_ROOT and MEDIA_ROOT not in destination.parents:
        raise ValueError("stored file name escapes MEDIA_ROOT")
    return destination


copied = 0
present = 0
found = 0
failures = []

for label, model, field_name in FIELD_SOURCES:
    queryset = model.objects.exclude(**{field_name: ""}).exclude(**{f"{field_name}__isnull": True})
    for instance in queryset.iterator():
        found += 1
        field = getattr(instance, field_name)
        try:
            destination = destination_for(field.name)
            if destination.is_file() and destination.stat().st_size > 0:
                present += 1
                continue
            if DRY_RUN:
                continue

            with requests.get(field.url, stream=True, timeout=(10, 120)) as response:
                response.raise_for_status()
                destination.parent.mkdir(parents=True, exist_ok=True)
                partial = destination.with_name(f".{destination.name}.partial")
                try:
                    with partial.open("wb") as output:
                        shutil.copyfileobj(response.raw, output)
                    if partial.stat().st_size == 0:
                        raise ValueError("downloaded file is empty")
                    os.replace(partial, destination)
                finally:
                    partial.unlink(missing_ok=True)
            copied += 1
        except Exception as exc:
            failures.append(f"{label} id={instance.pk}: {type(exc).__name__}")

print(
    {
        "dry_run": DRY_RUN,
        "found": found,
        "already_present": present,
        "copied": copied,
        "failed": len(failures),
    }
)
for failure in failures:
    print(failure)

if failures:
    raise SystemExit("Cloudinary media migration incomplete; deployment must not continue")
