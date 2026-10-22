import { Alert } from "react-native";
import RNFS from "react-native-fs";
import Share from "react-native-share";
import { strFromU8, strToU8, zipSync } from "fflate";

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

export function Exporter_toFile(filename: string, contents: string): void {
  exportToFile(filename, contents);
}

export function Exporter_toZip(filename: string, files: Record<string, string>): void {
  const entries: Record<string, Uint8Array> = {};
  for (const path of Object.keys(files)) {
    entries[path] = strToU8(files[path]);
  }
  exportToFile(filename, btoa(strFromU8(zipSync(entries), true)), "base64");
}

async function exportToFile(filename: string, contents: string, encoding: "utf8" | "base64" = "utf8"): Promise<void> {
  const tempPath = `${RNFS.CachesDirectoryPath}/${filename}`;
  try {
    await RNFS.writeFile(tempPath, contents, encoding);
    await Share.open({
      url: `file://${tempPath}`,
      type: mimeTypeFromFilename(filename),
      filename,
      failOnCancel: false,
    });
  } catch (e) {
    const err = e as { message?: string };
    if (err.message && /cancel|cancelled|user did not share/i.test(err.message)) {
      return;
    }
    Alert.alert("Export failed", err.message ?? "Unknown error");
  } finally {
    try {
      if (await RNFS.exists(tempPath)) {
        await RNFS.unlink(tempPath);
      }
    } catch {}
  }
}
