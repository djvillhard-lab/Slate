#!/usr/bin/env python3
"""Builds index.html (the app the phone loads) from src/.

    python3 build.py           build index.html and version.json
    python3 build.py --check   exit 1 if index.html doesn't match src/ (nothing written)
    python3 build.py --force   rebuild even if index.html was edited by hand (e.g. after a merge conflict)

src/shell.html is the page skeleton. Each {{path}} in it is replaced by that file from src/
({{app/*.js}} = every file in src/app/, in name order, all inside one shared function scope).
{{CHANGES}} becomes CHANGELOG.md (shown in Settings > Release history) and {{BUILD}} the build time.

A new build time (Central, YYYYMMDDHHMMSS) is stamped only when the page actually changed;
open apps compare it with version.json and reload onto the new version by themselves.
"""
import datetime, glob, hashlib, json, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
OUT = os.path.join(ROOT, "index.html")
VER = os.path.join(ROOT, "version.json")
LOG = os.path.join(ROOT, "CHANGELOG.md")
HEAD_RE = re.compile(r"^<!-- Built by build\.py from src/.*\(sha ([0-9a-f]{12})\) -->\n", re.M)


def read(p):
    with open(p, encoding="utf-8", newline="") as f:
        return f.read()


def one(text):  # a file's text without its final newline (the marker's own line break takes its place)
    return text[:-1] if text.endswith("\n") else text


def assemble(build):
    shell = read(os.path.join(SRC, "shell.html"))

    def sub(m):
        key = m.group(1)
        if key == "CHANGES":
            return json.dumps(read(LOG))
        if key == "BUILD":
            return build
        paths = sorted(glob.glob(os.path.join(SRC, key))) if "*" in key else [os.path.join(SRC, key)]
        if not paths or not all(os.path.isfile(p) for p in paths):
            sys.exit("build.py: src/%s not found" % key)
        return one("".join(read(p) for p in paths))

    return re.sub(r"\{\{([A-Za-z0-9_./*-]+)\}\}", sub, shell)


def strip_head(html):
    return HEAD_RE.sub("", html, count=1)


def with_head(body):
    sha = hashlib.sha256(body.encode("utf-8")).hexdigest()[:12]
    head = "<!-- Built by build.py from src/. Don't edit this file: edit src/, then run python3 build.py (sha %s) -->\n" % sha
    i = body.index("\n") + 1  # right after <!DOCTYPE html>
    return body[:i] + head + body[i:]


def check_version(body):
    v = re.search(r'var SLATE_VERSION = "([\d.]+)"', body)
    log = read(LOG)
    top = re.search(r"^## (\d+\.\d+\.\d+)\b.*$", log, re.M)
    if not v or not top:
        sys.exit("build.py: couldn't find SLATE_VERSION (src/app/010-core.js) or a '## X.Y.Z' entry in CHANGELOG.md")
    if v.group(1) != top.group(1):
        sys.exit("build.py: SLATE_VERSION is %s (src/app/010-core.js) but CHANGELOG.md's newest entry is %s. Make them match."
                 % (v.group(1), top.group(1)))
    entry = log[top.end():].split("\n## ", 1)[0]
    if "TestFlight:" not in entry:
        sys.exit("build.py: CHANGELOG.md's %s entry needs its TestFlight line (see the top of CHANGELOG.md)." % top.group(1))
    return v.group(1)


def now_central():
    try:
        from zoneinfo import ZoneInfo
        return datetime.datetime.now(ZoneInfo("America/Chicago"))
    except Exception:
        return datetime.datetime.now()


def main():
    args = set(sys.argv[1:])
    old_build = json.loads(read(VER)).get("build", "") if os.path.exists(VER) else ""
    current = read(OUT) if os.path.exists(OUT) else ""
    m = HEAD_RE.search(current)
    current_body = strip_head(current)
    if m and hashlib.sha256(current_body.encode("utf-8")).hexdigest()[:12] != m.group(1) and "--force" not in args:
        import difflib
        stamp = re.search(r'window\.SLATE_BUILD = "(\d*)"', current_body)
        d = list(difflib.unified_diff(assemble(stamp.group(1) if stamp else old_build).split("\n"), current_body.split("\n"),
                                      "built from src/", "index.html now", n=1, lineterm=""))
        print("\n".join(x[:300] for x in d[:80]))
        sys.exit("\nbuild.py: index.html was changed by hand since its last build (or has merge-conflict marks); the lines above\n"
                 "are the hand edits. Put them in src/ (they'd be lost otherwise), then run python3 build.py --force.\n"
                 "After a merge conflict in index.html or version.json, don't merge them by hand: run python3 build.py --force")

    same = assemble(old_build)
    if "--check" in args:
        if same != current_body:
            sys.exit("build.py --check: index.html is out of date with src/. Run: python3 build.py")
        print("index.html matches src/")
        return
    version = check_version(same)
    if same == current_body and m:
        print("Slate %s: index.html already up to date (build %s)" % (version, old_build))
        return
    build = old_build if same == current_body else now_central().strftime("%Y%m%d%H%M%S")
    body = assemble(build)
    with open(OUT, "w", encoding="utf-8", newline="") as f:
        f.write(with_head(body))
    with open(VER, "w", encoding="utf-8", newline="") as f:
        f.write(json.dumps({"build": build}))
    print("Slate %s: built index.html (%d KB), build %s" % (version, len(body.encode("utf-8")) // 1024, build))


if __name__ == "__main__":
    main()
