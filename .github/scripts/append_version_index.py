"""Append a release to the authoritative ModelScope catalog without dropping history.

Call under the shared publication concurrency group after uploading the archive.
Any read or validation failure aborts publication instead of resetting the catalog.
"""

import json
import subprocess
import tempfile
import urllib.request
import uuid
from pathlib import Path


def append_version_index(api, repo_id: str, token: str, version: str) -> None:
    url = (
        f"https://modelscope.cn/models/{repo_id}/resolve/master/releases/versions.json"
        f"?release_index={uuid.uuid4().hex}"
    )
    request = urllib.request.Request(url, headers={"Cache-Control": "no-cache"})
    # Never use the website's potentially cached redirect, or treat a failed read
    # (including 404) as an empty catalog. Initial catalogs require explicit setup.
    with urllib.request.urlopen(request, timeout=30) as response:
        previous = json.load(response)
    with tempfile.TemporaryDirectory() as work:
        root = Path(work)
        previous_file = root / "previous.json"
        names_file = root / "names.json"
        index_file = root / "versions.json"
        previous_file.write_text(json.dumps(previous), encoding="utf-8")
        names_file.write_text(json.dumps([version]), encoding="utf-8")
        subprocess.run(
            ["node", "scripts/build-version-index.mjs", str(names_file), str(index_file), str(previous_file)],
            check=True,
        )
        api.upload_file(
            path_or_fileobj=str(index_file),
            path_in_repo="releases/versions.json",
            repo_id=repo_id,
            commit_message=f"Append version {version} to release history",
            token=token,
        )
