// The offline build names its bundles by content hash, so a new deploy changes them and the service worker reads them from the page.
export function BundleNames_assetsInPage(html: string): string[] {
  const urls = new Set<string>();
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="(\/[^"]+\.(?:js|css))"/g)) {
    urls.add(match[1]);
  }
  return [...urls];
}

export const BundleNames_hashedAsset = /^\/(?:app|vendors)\.[0-9a-f]{8,}\.(?:js|css)$/;
