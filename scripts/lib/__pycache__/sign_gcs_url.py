#!/usr/bin/env python3
"""Upload a local file to GCS and emit a v4 signed URL.

Used by claude_critic.mjs because gsutil signurl on this machine can't
load pyopenssl (gsutil's bundled Python ignores user-site packages).
google-cloud-storage's blob.generate_signed_url(version='v4') uses
google.auth credentials end-to-end and works in pure Python 3.12.

Usage:
  sign_gcs_url.py <local_path> <bucket> <object_name> <expires_seconds>

Emits the signed HTTPS URL on stdout. Exits non-zero on failure.
"""

import sys
from datetime import timedelta

from google.cloud import storage  # type: ignore


def main() -> int:
    if len(sys.argv) != 5:
        sys.stderr.write(
            "usage: sign_gcs_url.py <local_path> <bucket> <object_name> <expires_seconds>\n"
        )
        return 2
    local_path, bucket_name, object_name, expires_s = sys.argv[1:5]
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(object_name)
    blob.upload_from_filename(local_path)
    url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(seconds=int(expires_s)),
        method="GET",
    )
    sys.stdout.write(url + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
