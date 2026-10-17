// beBEARlifts fork: renders iOS Home Screen launch screens and writes their <link> tags into src/index.html.
// Run with `node scripts/generate-launch-screens.js` after changing icons/icon512.png.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

// CSS width, CSS height, pixel ratio. Portrait only: the app does not rotate.
const IPHONES = [
  [440, 956, 3],
  [420, 912, 3],
  [402, 874, 3],
  [430, 932, 3],
  [393, 852, 3],
  [428, 926, 3],
  [390, 844, 3],
  [414, 896, 3],
  [375, 812, 3],
  [414, 896, 2],
  [414, 736, 3],
  [375, 667, 2],
  [320, 568, 2],
];

const SCHEMES = {
  light: { background: "#ffffff", text: "#1f1b2d" },
  dark: { background: "#000000", text: "#ffffff" },
};

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "icons", "launch");
const indexPath = path.join(root, "src", "index.html");
const iconData = fs.readFileSync(path.join(root, "icons", "icon512.png")).toString("base64");

function page(scheme) {
  const c = SCHEMES[scheme];
  return `<!doctype html><html><body style="margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:${c.background};font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif">
<img src="data:image/png;base64,${iconData}" style="width:112px;height:112px;border-radius:25px">
<div style="font-size:22px;font-weight:600;letter-spacing:-0.2px;color:${c.text}">beBEARlifts</div>
</body></html>`;
}

function fileName(w, h, r, scheme) {
  return `launch-${w * r}x${h * r}-${scheme}.png`;
}

function linkTag(w, h, r, scheme) {
  const media = `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait) and (prefers-color-scheme: ${scheme})`;
  return `    <link rel="apple-touch-startup-image" media="${media}" href="/icons/launch/${fileName(w, h, r, scheme)}" />`;
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const tags = [];
  for (const scheme of Object.keys(SCHEMES)) {
    for (const [w, h, r] of IPHONES) {
      const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: r });
      const p = await context.newPage();
      await p.setContent(page(scheme));
      await p.screenshot({ path: path.join(outDir, fileName(w, h, r, scheme)) });
      await context.close();
      tags.push(linkTag(w, h, r, scheme));
    }
  }
  await browser.close();

  const html = fs.readFileSync(indexPath, "utf8");
  const start = "<!-- LAUNCH_SCREENS_START -->";
  const end = "<!-- LAUNCH_SCREENS_END -->";
  const before = html.slice(0, html.indexOf(start) + start.length);
  const after = html.slice(html.indexOf(end));
  fs.writeFileSync(indexPath, `${before}\n${tags.join("\n")}\n    ${after}`);
  console.log(`Wrote ${tags.length} launch screens to ${path.relative(root, outDir)}`);
})();
