export type IFileShareNavigator = Partial<Pick<Navigator, "share" | "canShare">>;
export type IFileShareResult = "shared" | "cancelled" | "refused" | "unavailable";

const revokeAfterMs = 60 * 1000;

// iOS Safari refuses navigator.share after an await, so callers reach this from the tap without one.
export async function FileShare_share(files: File[], nav: IFileShareNavigator): Promise<IFileShareResult> {
  if (typeof nav.share !== "function" || nav.canShare == null || !nav.canShare({ files })) {
    return "unavailable";
  }
  try {
    await nav.share({ files });
    return "shared";
  } catch (error) {
    const name = (error as { name?: string }).name;
    if (name === "AbortError") {
      return "cancelled";
    }
    if (name === "NotAllowedError") {
      return "refused";
    }
    throw error;
  }
}

export function FileShare_download(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), revokeAfterMs);
}
