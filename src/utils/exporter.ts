import { strToU8, zipSync } from "fflate";

type IFileContents = string | Uint8Array;

export function Exporter_toFile(filename: string, contents: string): void {
  exportContents(filename, contents);
}

export function Exporter_toZip(filename: string, files: Record<string, string>): void {
  const entries: Record<string, Uint8Array> = {};
  for (const path of Object.keys(files)) {
    entries[path] = strToU8(files[path]);
  }
  exportContents(filename, zipSync(entries));
}

function exportContents(filename: string, contents: IFileContents): void {
  if (isStandaloneApp() && canShareFile(filename)) {
    shareFile(filename, contents);
    return;
  }
  downloadViaLink(filename, contents);
}

function mimeTypeFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".json")) {
    return "application/json";
  }
  if (lower.endsWith(".csv")) {
    return "text/csv";
  }
  if (lower.endsWith(".zip")) {
    return "application/zip";
  }
  return "text/plain";
}

// A Home Screen app on iOS has no download bar, so <a download> there is unreliable. The share
// sheet gives "Save to Files", AirDrop and iCloud Drive instead.
function isStandaloneApp(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.("(display-mode: standalone)").matches === true;
}

function canShareFile(filename: string): boolean {
  if (typeof navigator === "undefined" || navigator.canShare == null || typeof File === "undefined") {
    return false;
  }
  return navigator.canShare({ files: [new File([""], filename, { type: mimeTypeFromFilename(filename) })] });
}

function shareFile(filename: string, contents: IFileContents): void {
  const file = new File([contents], filename, { type: mimeTypeFromFilename(filename) });
  navigator.share({ files: [file], title: filename }).catch((e: DOMException) => {
    if (e.name !== "AbortError") {
      downloadViaLink(filename, contents);
    }
  });
}

function downloadViaLink(filename: string, contents: IFileContents): void {
  const blob = new Blob([contents], {
    type: mimeTypeFromFilename(filename),
  });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
