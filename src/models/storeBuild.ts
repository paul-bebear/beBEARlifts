// App Review guideline 3.1.1 forbids unlocking features with our own codes outside in-app purchase.
// iOS names the receipt "sandboxReceipt" in TestFlight and dev installs, "receipt" in App Store installs.
export function StoreBuild_showsProCodes(os: string, receiptName: string | undefined, isDev: boolean): boolean {
  if (os !== "ios" || isDev) {
    return true;
  }
  return receiptName === "sandboxReceipt";
}
