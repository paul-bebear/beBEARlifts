#!/bin/bash
# Release build signed with the team's development profiles, installed on a USB-connected iPhone.
# Profiles come from scripts/ios-signing.ts; a new phone needs `npm run ios-signing -- device <udid> <name>`
# and `npm run ios-signing -- profiles dev` first.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

ENV_FILE="$HOME/.appstoreconnect/bebear.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  . "$ENV_FILE"
  set +a
fi

# Without watchman, Metro lists every file under .claude/worktrees and the bundle step dies with
# "RangeError: Invalid string length".
if ! command -v watchman >/dev/null; then
  echo "Install watchman first: brew install watchman" >&2
  exit 1
fi

DEVICE="${BEBEAR_DEVICE:-}"
if [ -z "$DEVICE" ]; then
  DEVICES_JSON="$(mktemp)"
  xcrun devicectl list devices -j "$DEVICES_JSON" >/dev/null
  DEVICE="$(node -e '
    const devices = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).result.devices;
    const phone = devices.find((d) => d.connectionProperties.tunnelState === "connected" && d.hardwareProperties.platform === "iOS");
    process.stdout.write(phone ? phone.identifier : "");
  ' "$DEVICES_JSON")"
  rm -f "$DEVICES_JSON"
fi
if [ -z "$DEVICE" ]; then
  echo "No connected iPhone. Plug it in and unlock it, or set BEBEAR_DEVICE." >&2
  exit 1
fi

PROFILE_SETTINGS=()
while IFS= read -r line; do
  PROFILE_SETTINGS+=("$line")
done < <(TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/ios-signing.ts build-settings dev)

npm run build:programs
NODE_ENV=production npm run build:watch-bundle

DERIVED_DATA="$ROOT/ios/build/DeviceSigned"
# A plain PROVISIONING_PROFILE_SPECIFIER on the command line reaches every pod target, and they refuse it.
# Each app target looks up its own BEBEAR_PROFILE_<target>; pod targets resolve to empty.
xcodebuild \
  -workspace ios/Liftosaur.xcworkspace \
  -scheme Liftosaur \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -derivedDataPath "$DERIVED_DATA" \
  CODE_SIGN_STYLE=Manual \
  CODE_SIGN_IDENTITY="Apple Development" \
  'PROVISIONING_PROFILE_SPECIFIER=$(BEBEAR_PROFILE_$(TARGET_NAME))' \
  "${PROFILE_SETTINGS[@]}" \
  build

xcrun devicectl device install app --device "$DEVICE" "$DERIVED_DATA/Build/Products/Release-iphoneos/Liftosaur.app"
