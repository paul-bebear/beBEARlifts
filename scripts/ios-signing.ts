import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// xcodebuild -authenticationKeyPath rejects this team key with "Authentication failed" (Xcode 26.6),
// while the same key works against the API, so profiles are made here and the build signs manually.

type IProfileKind = "dev" | "appstore";

interface ITarget {
  xcodeTarget: string;
  suffix: string;
}

const targets: ITarget[] = [
  { xcodeTarget: "Liftosaur", suffix: "" },
  { xcodeTarget: "LiftosaurWorkoutWidgetExtension", suffix: ".LiftosaurWorkoutWidgetExtension" },
  { xcodeTarget: "LiftosaurWatch", suffix: ".watchkitapp" },
  { xcodeTarget: "LiftosaurWatchComplication", suffix: ".watchkitapp.complications" },
];

const repoRoot = path.resolve(__dirname, "..");
const profilesDir = path.join(os.homedir(), "Library/MobileDevice/Provisioning Profiles");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Put it in ~/.appstoreconnect/bebear.env`);
  }
  return value;
}

function brandingSetting(name: string): string {
  const xcconfig = fs.readFileSync(path.join(repoRoot, "ios/AppBranding.xcconfig"), "utf8");
  const match = xcconfig.match(new RegExp(`^${name} = (.+)$`, "m"));
  if (!match) {
    throw new Error(`${name} missing from ios/AppBranding.xcconfig`);
  }
  return match[1].trim();
}

function bundlePrefix(): string {
  return brandingSetting("APP_BUNDLE_PREFIX");
}

function profileName(bundleId: string, kind: IProfileKind): string {
  return kind === "dev" ? `${bundleId} dev` : bundleId;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function token(): string {
  const keyId = requireEnv("ASC_KEY_ID");
  const keyPath =
    process.env.ASC_KEY_PATH || path.join(os.homedir(), `.appstoreconnect/private_keys/AuthKey_${keyId}.p8`);
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }));
  const body = b64url(
    JSON.stringify({ iss: requireEnv("ASC_ISSUER_ID"), iat: now, exp: now + 600, aud: "appstoreconnect-v1" })
  );
  const signature = crypto.sign("sha256", Buffer.from(`${header}.${body}`), {
    key: fs.readFileSync(keyPath, "utf8"),
    dsaEncoding: "ieee-p1363",
  });
  return `${header}.${body}.${b64url(signature)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function api(method: string, urlPath: string, body?: unknown): Promise<any> {
  const response = await fetch(`https://api.appstoreconnect.apple.com${urlPath}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const errors = (json.errors || []).map((e: { code: string; detail: string }) => `${e.code}: ${e.detail}`);
    throw new Error(`${method} ${urlPath} -> ${response.status} ${errors.join("; ")}`);
  }
  return json;
}

async function ids(urlPath: string): Promise<{ type: string; id: string }[]> {
  const json = await api("GET", urlPath);
  return json.data.map((d: { type: string; id: string }) => ({ type: d.type, id: d.id }));
}

function removeLocalProfiles(name: string): void {
  for (const file of fs.readdirSync(profilesDir).filter((f) => f.endsWith(".mobileprovision"))) {
    const content = fs.readFileSync(path.join(profilesDir, file), "latin1");
    const match = content.match(/<key>Name<\/key>\s*<string>([^<]*)<\/string>/);
    if (match && match[1] === name) {
      fs.unlinkSync(path.join(profilesDir, file));
    }
  }
}

async function registerDevice(udid: string, name: string): Promise<void> {
  const existing = await ids(`/v1/devices?filter[udid]=${udid}`);
  if (existing.length > 0) {
    console.log(`${udid} is already registered`);
    return;
  }
  await api("POST", "/v1/devices", { data: { type: "devices", attributes: { name, platform: "IOS", udid } } });
  console.log(`registered ${name} (${udid})`);
}

async function makeProfiles(kind: IProfileKind): Promise<void> {
  const certificates = await ids(
    `/v1/certificates?limit=50&filter[certificateType]=${kind === "dev" ? "DEVELOPMENT,IOS_DEVELOPMENT" : "DISTRIBUTION,IOS_DISTRIBUTION"}`
  );
  const devices = kind === "dev" ? await ids("/v1/devices?limit=200&filter[platform]=IOS&filter[status]=ENABLED") : [];
  fs.mkdirSync(profilesDir, { recursive: true });
  for (const target of targets) {
    const bundleId = `${bundlePrefix()}${target.suffix}`;
    const [bundle] = await ids(`/v1/bundleIds?filter[identifier]=${encodeURIComponent(bundleId)}`);
    if (!bundle) {
      throw new Error(`${bundleId} is not registered on the team`);
    }
    const name = profileName(bundleId, kind);
    for (const old of await ids(`/v1/profiles?filter[name]=${encodeURIComponent(name)}`)) {
      await api("DELETE", `/v1/profiles/${old.id}`);
    }
    const created = await api("POST", "/v1/profiles", {
      data: {
        type: "profiles",
        attributes: { name, profileType: kind === "dev" ? "IOS_APP_DEVELOPMENT" : "IOS_APP_STORE" },
        relationships: {
          bundleId: { data: bundle },
          certificates: { data: certificates },
          ...(kind === "dev" ? { devices: { data: devices } } : {}),
        },
      },
    });
    const { uuid, profileContent } = created.data.attributes;
    removeLocalProfiles(name);
    fs.writeFileSync(path.join(profilesDir, `${uuid}.mobileprovision`), Buffer.from(profileContent, "base64"));
    console.log(`"${name}" ${uuid}`);
  }
}

function buildSettings(kind: IProfileKind): void {
  // Swift package resource bundles such as Runestone_Runestone ignore the xcconfig and need the team here.
  console.log(`DEVELOPMENT_TEAM=${brandingSetting("APP_DEVELOPMENT_TEAM")}`);
  for (const target of targets) {
    console.log(`BEBEAR_PROFILE_${target.xcodeTarget}=${profileName(`${bundlePrefix()}${target.suffix}`, kind)}`);
  }
}

function exportOptions(destination: string): void {
  const profiles = targets
    .map((target) => `${bundlePrefix()}${target.suffix}`)
    .map((bundleId) => `    <key>${bundleId}</key>\n    <string>${profileName(bundleId, "appstore")}</string>`)
    .join("\n");
  console.log(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>destination</key>
  <string>${destination}</string>
  <key>signingStyle</key>
  <string>manual</string>
  <key>signingCertificate</key>
  <string>Apple Distribution</string>
  <key>teamID</key>
  <string>${brandingSetting("APP_DEVELOPMENT_TEAM")}</string>
  <key>provisioningProfiles</key>
  <dict>
${profiles}
  </dict>
  <key>uploadSymbols</key>
  <true/>
  <key>manageAppVersionAndBuildNumber</key>
  <false/>
</dict>
</plist>`);
}

async function appRecord(version: string): Promise<void> {
  const [app] = await ids(`/v1/apps?filter[bundleId]=${encodeURIComponent(bundlePrefix())}`);
  if (!app) {
    console.log("APP_ID=");
    return;
  }
  const builds = await api(
    "GET",
    `/v1/builds?filter[app]=${app.id}&filter[preReleaseVersion.version]=${encodeURIComponent(version)}&limit=200`
  );
  const numbers: number[] = builds.data.map((b: { attributes: { version: string } }) => Number(b.attributes.version));
  console.log(`APP_ID=${app.id}`);
  console.log(`LAST_BUILD=${numbers.length > 0 ? Math.max(...numbers) : 0}`);
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (command === "device" && args.length === 2) {
    await registerDevice(args[0], args[1]);
  } else if (command === "profiles" && (args[0] === "dev" || args[0] === "appstore")) {
    await makeProfiles(args[0]);
  } else if (command === "build-settings" && (args[0] === "dev" || args[0] === "appstore")) {
    buildSettings(args[0]);
  } else if (command === "export-options" && args.length === 1) {
    exportOptions(args[0]);
  } else if (command === "app" && args.length === 1) {
    await appRecord(args[0]);
  } else {
    console.error(
      "usage: ios-signing.ts device <udid> <name> | profiles <dev|appstore> | build-settings <dev|appstore>" +
        " | export-options <export|upload> | app <marketing-version>"
    );
    process.exit(1);
  }
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
