// On the web the service worker caches /images/ responses, so a viewed demo already works offline.
export function DemoFileCache_initialUri(_fileName: string, remoteUrl: string): string {
  return remoteUrl;
}

export function DemoFileCache_markMissing(_fileName: string): void {}

export async function DemoFileCache_touch(_fileName: string): Promise<void> {}

export async function DemoFileCache_store(_fileName: string, _remoteUrl: string): Promise<void> {}
