import "mocha";
import { expect } from "chai";
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const root = path.resolve(".");
const targets = [
  ["Liftosaur", ""],
  ["LiftosaurWorkoutWidgetExtension", ".LiftosaurWorkoutWidgetExtension"],
  ["LiftosaurWatch", ".watchkitapp"],
  ["LiftosaurWatchComplication", ".watchkitapp.complications"],
];
const xcconfig = fs.readFileSync(path.join(root, "ios/AppBranding.xcconfig"), "utf8");
const branding = (name: string): string => xcconfig.match(new RegExp(`^${name} = (.+)$`, "m"))![1].trim();

function run(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, ["-r", "ts-node/register", "scripts/ios-signing.ts", ...args], {
    cwd: root,
    encoding: "utf8",
    env: { PATH: process.env.PATH, HOME: "/nonexistent", TS_NODE_TRANSPILE_ONLY: "1" },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe("ios-signing.ts offline commands", function () {
  this.timeout(60000);
  const prefix = branding("APP_BUNDLE_PREFIX");
  const team = branding("APP_DEVELOPMENT_TEAM");

  it("prints the team and one profile name per target for build-settings", () => {
    const dev = run(["build-settings", "dev"]).stdout.trim().split("\n");
    expect(dev[0]).to.equal(`DEVELOPMENT_TEAM=${team}`);
    expect(dev.slice(1)).to.deep.equal(
      targets.map(([name, suffix]) => `BEBEAR_PROFILE_${name}=${prefix}${suffix} dev`)
    );
  });

  it("writes export options that sign every target manually with its app store profile", () => {
    const out = run(["export-options", "upload"]).stdout;
    expect(out).to.contain("<key>destination</key>\n  <string>upload</string>");
    expect(out).to.contain("<key>signingStyle</key>\n  <string>manual</string>");
    expect(out).to.contain(`<key>teamID</key>\n  <string>${team}</string>`);
    for (const [, suffix] of targets) {
      expect(out).to.contain(`<key>${prefix}${suffix}</key>\n    <string>${prefix}${suffix}</string>`);
    }
  });

  it("prints the usage and exits with 1 for an unknown command or profile kind", () => {
    const unknown = run(["nonsense"]);
    expect(unknown.status).to.equal(1);
    expect(unknown.stderr).to.contain("usage: ios-signing.ts");
    expect(run(["build-settings", "release"]).status).to.equal(1);
  });
});
