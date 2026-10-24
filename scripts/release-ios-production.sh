#!/bin/bash
# Archives, signs and uploads the iPhone app with the beBEAR team key in ~/.appstoreconnect/bebear.env.
# xcodebuild -authenticationKeyPath rejects that key on Xcode 26.6, so signing is manual with the
# App Store profiles that scripts/ios-signing.ts makes through the App Store Connect API.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PBXPROJ="ios/Liftosaur.xcodeproj/project.pbxproj"
ENV_FILE="$HOME/.appstoreconnect/bebear.env"
branding_setting() {
  awk -F ' = ' -v key="$1" '$1 == key { print $2; exit }' "$ROOT/ios/AppBranding.xcconfig"
}
TEAM_ID=$(branding_setting APP_DEVELOPMENT_TEAM)
BUNDLE_ID=$(branding_setting APP_BUNDLE_PREFIX)
NOTES_DIR="$ROOT/ios/release-notes/en-US"
NOTES_FILE="$NOTES_DIR/production.txt"
ANDROID_NOTES_FILE="$ROOT/android/app/src/main/play/release-notes/en-US/production.txt"
ARCHIVE_DIR="$ROOT/ios/build/archive"
ARCHIVE_PATH="$ARCHIVE_DIR/Liftosaur.xcarchive"
EXPORT_PATH="$ARCHIVE_DIR/export"
EXPORT_OPTIONS="$ARCHIVE_DIR/ExportOptions.plist"
# A clean DerivedData per release: a reused one kept a stale ReactCodegen header after a TurboModule spec change.
DERIVED_DATA="$HOME/Library/Developer/Xcode/DerivedData/bebear-release"
APP_STORE_NOTES_LIMIT=4000

DRY_RUN=0
SKIP_BUILD=0
TESTFLIGHT=0
NO_SUBMIT=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    --testflight) TESTFLIGHT=1 ;;
    --no-submit) NO_SUBMIT=1 ;;
    *)
      echo "Unknown arg: $arg" >&2
      echo "Usage: $0 [--dry-run] [--skip-build] [--testflight] [--no-submit]" >&2
      echo "  --dry-run     archive and export a signed .ipa locally, no upload, no App Store Connect changes" >&2
      echo "  --skip-build  skip the archive and upload, only submit the already uploaded build for review" >&2
      echo "  --testflight  archive and upload, then stop: no release notes, no review submission" >&2
      echo "  --no-submit   do everything up to the review: upload, create the version, attach the build," >&2
      echo "                set the release notes, then stop without submitting for review" >&2
      exit 1
      ;;
  esac
done

if [[ $DRY_RUN -eq 1 && $SKIP_BUILD -eq 1 ]]; then
  echo "ERROR: --dry-run and --skip-build together leave nothing to do." >&2
  exit 1
fi
if [[ $TESTFLIGHT -eq 1 && ($DRY_RUN -eq 1 || $SKIP_BUILD -eq 1) ]]; then
  echo "ERROR: --testflight cannot be combined with --dry-run or --skip-build." >&2
  exit 1
fi
if [[ $NO_SUBMIT -eq 1 && ($DRY_RUN -eq 1 || $TESTFLIGHT -eq 1) ]]; then
  echo "ERROR: --no-submit cannot be combined with --dry-run or --testflight, which never submit." >&2
  exit 1
fi

if [[ -z "$TEAM_ID" || -z "$BUNDLE_ID" ]]; then
  echo "ERROR: set APP_DEVELOPMENT_TEAM and APP_BUNDLE_PREFIX in ios/AppBranding.xcconfig." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE is missing. It sets ASC_KEY_ID and ASC_ISSUER_ID for the team's App Store Connect key." >&2
  exit 1
fi
set -a
. "$ENV_FILE"
set +a
KEY="${ASC_KEY_PATH:-$HOME/.appstoreconnect/private_keys/AuthKey_$ASC_KEY_ID.p8}"
if [[ ! -f "$KEY" ]]; then
  echo "ERROR: App Store Connect API key not found at $KEY" >&2
  exit 1
fi

# Without watchman, Metro lists every file under .claude/worktrees and the bundle step dies with
# "RangeError: Invalid string length".
if [[ $SKIP_BUILD -eq 0 ]] && ! command -v watchman >/dev/null; then
  echo "ERROR: install watchman first: brew install watchman" >&2
  exit 1
fi

signing() {
  (cd "$ROOT" && TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/ios-signing.ts "$@")
}

build_setting_for() {
  awk -v setting="$1 = " -v bid="$2" '
    index($0, setting) > 0 {
      value = $0
      sub(".*" setting, "", value)
      sub(/;.*/, "", value)
      gsub(/[ \t"]/, "", value)
    }
    index($0, "PRODUCT_BUNDLE_IDENTIFIER = " bid ";") > 0 ||
    index($0, "PRODUCT_BUNDLE_IDENTIFIER = \"$(APP_BUNDLE_PREFIX)\";") > 0 { print value; exit }
  '
}

VERSION=$(build_setting_for MARKETING_VERSION "$BUNDLE_ID" < "$ROOT/$PBXPROJ")
BUILD_NUMBER=$(build_setting_for CURRENT_PROJECT_VERSION "$BUNDLE_ID" < "$ROOT/$PBXPROJ")
if [[ -z "$VERSION" || -z "$BUILD_NUMBER" ]]; then
  echo "ERROR: could not read MARKETING_VERSION / CURRENT_PROJECT_VERSION for $BUNDLE_ID from $PBXPROJ" >&2
  exit 1
fi
echo "iOS $BUNDLE_ID version $VERSION ($BUILD_NUMBER), team $TEAM_ID, key $ASC_KEY_ID"

APP_ID=""
LAST_BUILD=0
while IFS='=' read -r name value; do
  case "$name" in
    APP_ID) APP_ID="$value" ;;
    LAST_BUILD) LAST_BUILD="$value" ;;
  esac
done < <(signing app "$VERSION")

if [[ -z "$APP_ID" ]]; then
  if [[ $DRY_RUN -eq 0 ]]; then
    echo "WARN: App Store Connect has no app record for $BUNDLE_ID." >&2
    echo "      The script builds the signed .ipa and stops before the upload, which needs the record." >&2
    echo "      Create it in App Store Connect: Apps, +, New App, bundle ID $BUNDLE_ID." >&2
  fi
  if [[ $SKIP_BUILD -eq 1 ]]; then
    exit 1
  fi
elif [[ $DRY_RUN -eq 0 && $SKIP_BUILD -eq 0 && "$BUILD_NUMBER" -le "$LAST_BUILD" ]]; then
  echo "ERROR: build $LAST_BUILD of version $VERSION is already uploaded." >&2
  echo "Raise CURRENT_PROJECT_VERSION above $LAST_BUILD in $PBXPROJ (all targets)." >&2
  exit 1
fi

if [[ $TESTFLIGHT -eq 0 && $DRY_RUN -eq 0 ]]; then
if [[ -z "${EDITOR:-}" ]]; then
  echo "ERROR: \$EDITOR is not set, cannot ask for release notes." >&2
  exit 1
fi

DRAFT=$(mktemp "${TMPDIR:-/tmp}/ios-release-notes.XXXXXX")
trap 'rm -f "$DRAFT"' EXIT
if [[ -f "$NOTES_FILE" ]]; then
  cat "$NOTES_FILE" > "$DRAFT"
elif [[ -f "$ANDROID_NOTES_FILE" ]]; then
  cat "$ANDROID_NOTES_FILE" > "$DRAFT"
else
  echo > "$DRAFT"
fi
cat >> "$DRAFT" <<EOF

# Release notes for iOS $VERSION ($BUILD_NUMBER), App Store version $VERSION.
# Pre-filled from the last saved iOS notes, or the Android notes, when present. Clear them to cancel.
# Lines starting with '#' are dropped. Save an empty message to cancel.
# App Store caps "What's New" at $APP_STORE_NOTES_LIMIT characters.
EOF

sh -c "$EDITOR \"\$@\"" sh "$DRAFT"

NOTES=$(grep -v '^#' "$DRAFT" | sed -e 's/[[:space:]]*$//' | awk '/./ { started = 1 } started { print }')
NOTES="${NOTES%"${NOTES##*[![:space:]]}"}"

if [[ -z "${NOTES//[[:space:]]/}" ]]; then
  echo "Aborting release: empty release notes."
  exit 1
fi

if [[ ${#NOTES} -gt $APP_STORE_NOTES_LIMIT ]]; then
  echo "ERROR: release notes are ${#NOTES} characters, App Store allows $APP_STORE_NOTES_LIMIT." >&2
  exit 1
fi

mkdir -p "$NOTES_DIR"
printf '%s\n' "$NOTES" > "$NOTES_FILE"

echo
echo "Release notes (${#NOTES} chars):"
echo "----------------------------------------"
echo "$NOTES"
echo "----------------------------------------"
echo
fi

run_xcodebuild() {
  local log="$1"
  shift
  if ! RCT_USE_PREBUILT_RNCORE=1 RCT_NEW_ARCH_ENABLED=1 USE_FRAMEWORKS=static xcodebuild "$@" > "$log" 2>&1; then
    echo "xcodebuild failed, last 60 lines of $log:" >&2
    tail -60 "$log" >&2
    exit 1
  fi
}

if [[ $SKIP_BUILD -eq 0 ]]; then
  cd "$ROOT"
  rm -rf "$ARCHIVE_DIR" "$DERIVED_DATA"
  mkdir -p "$ARCHIVE_DIR"
  # In a worktree, watchman otherwise reuses the main checkout's watch, whose .watchmanconfig ignores
  # .claude/worktrees, and Metro fails with "Failed to get the SHA-1 for: .../index.js".
  watchman watch "$ROOT" > /dev/null

  echo "Making App Store provisioning profiles..."
  signing profiles appstore
  PROFILE_SETTINGS=()
  while IFS= read -r line; do
    PROFILE_SETTINGS+=("$line")
  done < <(signing build-settings appstore)

  echo "Building the production watch bundle and programs..."
  # build:watch-bundle runs build:markdown, which writes src/generated/whatsnew that build:programs imports.
  NODE_ENV=production npm run build:watch-bundle > "$ARCHIVE_DIR/watch-bundle.log" 2>&1 || {
    tail -30 "$ARCHIVE_DIR/watch-bundle.log" >&2
    exit 1
  }
  npm run build:programs > "$ARCHIVE_DIR/programs.log" 2>&1 || {
    tail -30 "$ARCHIVE_DIR/programs.log" >&2
    exit 1
  }

  echo "Archiving $VERSION ($BUILD_NUMBER), log: ios/build/archive/archive.log ..."
  # A plain PROVISIONING_PROFILE_SPECIFIER on the command line reaches every pod target, and they refuse it.
  # Each app target looks up its own BEBEAR_PROFILE_<target>; pod targets resolve to empty.
  run_xcodebuild "$ARCHIVE_DIR/archive.log" \
    -workspace ios/Liftosaur.xcworkspace \
    -scheme Liftosaur \
    -configuration Release \
    -destination "generic/platform=iOS" \
    -archivePath "$ARCHIVE_PATH" \
    -derivedDataPath "$DERIVED_DATA" \
    CODE_SIGN_STYLE=Manual \
    CODE_SIGN_IDENTITY="Apple Distribution" \
    'PROVISIONING_PROFILE_SPECIFIER=$(BEBEAR_PROFILE_$(TARGET_NAME))' \
    "${PROFILE_SETTINGS[@]}" \
    archive

  signing export-options export > "$EXPORT_OPTIONS"
  echo "Exporting the signed .ipa, log: ios/build/archive/export.log ..."
  run_xcodebuild "$ARCHIVE_DIR/export.log" \
    -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportOptionsPlist "$EXPORT_OPTIONS" \
    -exportPath "$EXPORT_PATH"
  IPA=$(ls "$EXPORT_PATH"/*.ipa)
  echo "Signed .ipa: $IPA"

  if [[ $DRY_RUN -eq 1 ]]; then
    echo "Dry run: nothing uploaded, App Store Connect untouched."
    exit 0
  fi
  if [[ -z "$APP_ID" ]]; then
    echo "ERROR: stopped before the upload. App Store Connect has no app record for $BUNDLE_ID." >&2
    echo "Create it (Apps, +, New App), then run this script again." >&2
    exit 1
  fi

  echo "Uploading to App Store Connect..."
  xcrun altool --upload-package "$IPA" --api-key "$ASC_KEY_ID" --api-issuer "$ASC_ISSUER_ID" --p8-file-path "$KEY"
  echo "Uploaded $VERSION ($BUILD_NUMBER) to App Store Connect."
  if [[ $TESTFLIGHT -eq 1 ]]; then
    echo "TestFlight only: App Store Connect processes the build in a few minutes, then it shows under TestFlight. Nothing submitted for review."
    exit 0
  fi
fi

cd "$ROOT"
if [[ $NO_SUBMIT -eq 1 ]]; then
  echo "Waiting for App Store Connect to process the build, then preparing the version (no review submission)..."
else
  echo "Waiting for App Store Connect to process the build, then submitting for review..."
fi
TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/releaseIos/submitToAppStore.ts \
  --version "$VERSION" \
  --build "$BUILD_NUMBER" \
  --notesFile "$NOTES_FILE" \
  --noSubmit "$NO_SUBMIT"
echo "Release notes saved to ios/release-notes/en-US/production.txt"
