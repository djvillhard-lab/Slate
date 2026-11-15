#!/bin/sh
# Xcode Cloud, before each build: the app's version (what TestFlight shows before the build number, "3.29.0 (33)")
# is Slate's own version, read from the web app (index.html's SLATE_VERSION), so the two always match.
set -e
REPO="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/../.." && pwd)}"
V=$(grep -o 'SLATE_VERSION = "[0-9][0-9.]*"' "$REPO/index.html" | head -1 | sed 's/.*"\(.*\)"/\1/')
if [ -n "$V" ]; then
  sed -i '' "s/MARKETING_VERSION = \"[0-9.]*\";/MARKETING_VERSION = \"$V\";/g" "$REPO/ios/Slate.xcodeproj/project.pbxproj"
  echo "Slate version $V"
fi
