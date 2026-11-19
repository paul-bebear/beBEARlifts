import { AccountPlan_isPlus, IAccountPlanState } from "./accountPlan";
import { AiCaps_plusFeature, IAiCapsPlan } from "./aiCaps";

export type IPlusFeature =
  | "ai"
  | "weekInsights"
  | "muscles"
  | "trendLines"
  | "api"
  | "plates"
  | "restTimer"
  | "watch"
  | "graphs"
  | "measurements"
  | "importExport";

export type IPlusTier = "free" | "plus";

export interface IPlusFeatureInfo {
  key: IPlusFeature;
  tier: IPlusTier;
  title: string;
  description: string;
}

export interface IPlusPrices {
  monthly?: string;
  annual?: string;
  lifetime?: string;
}

export interface IPlusStorePackage {
  product: { priceString: string };
}

export interface IPlusStoreOffering {
  monthly: IPlusStorePackage | null;
  annual: IPlusStorePackage | null;
  lifetime: IPlusStorePackage | null;
}

// Decided 2026-10-25: anything that logs is free. Anything that analyzes, uses AI or connects to another tool is beBEAR+.
const features: IPlusFeatureInfo[] = [
  { key: "ai", tier: "plus", ...AiCaps_plusFeature(undefined) },
  {
    key: "weekInsights",
    tier: "plus",
    title: "Week Insights",
    description: "Volume, sets, PRs and sets per muscle for each week, on the Home week card.",
  },
  { key: "muscles", tier: "plus", title: "Muscle views", description: "Which muscles a program or a day trains." },
  { key: "trendLines", tier: "plus", title: "Trend lines", description: "The moving average on your graphs." },
  {
    key: "api",
    tier: "plus",
    title: "API and MCP",
    description: "API keys under Me → API Keys, so Claude or ChatGPT can read your workouts and programs.",
  },
  {
    key: "plates",
    tier: "free",
    title: "Plates calculator",
    description: "The plates to load on each side of the bar.",
  },
  {
    key: "restTimer",
    tier: "free",
    title: "Rest timer alerts",
    description: "A notification when rest ends, and the Live Activity on iPhone.",
  },
  { key: "watch", tier: "free", title: "Apple Watch app", description: "Log sets from your wrist." },
  {
    key: "graphs",
    tier: "free",
    title: "Graphs",
    description: "Every lift and your body weight, with all your history.",
  },
  { key: "measurements", tier: "free", title: "Body measurements", description: "Log and graph them." },
  { key: "importExport", tier: "free", title: "Import and export", description: "Your data stays yours." },
];

const screenFeatures: Partial<Record<string, IPlusFeature>> = {
  musclesProgram: "muscles",
  musclesDay: "muscles",
  graphsList: "graphs",
};

export const PlusAccess_prices = "$6.99 a month, $39.99 a year, or $79.99 once for life.";
export const PlusAccess_pricesInStore = "Prices show in the App Store.";

const priceKinds: (keyof IPlusPrices)[] = ["monthly", "annual", "lifetime"];
const priceWords: Record<keyof IPlusPrices, string> = {
  monthly: "a month",
  annual: "a year",
  lifetime: "once for life",
};

export function PlusAccess_pricesFromOffering(offering: IPlusStoreOffering | null | undefined): IPlusPrices {
  const prices: IPlusPrices = {};
  for (const kind of priceKinds) {
    const priceString = offering?.[kind]?.product.priceString;
    if (priceString) {
      prices[kind] = priceString;
    }
  }
  return prices;
}

export function PlusAccess_pricesLine(prices: IPlusPrices | undefined, isWeb: boolean): string {
  const parts = priceKinds.flatMap((kind) => {
    const price = prices?.[kind];
    return price == null ? [] : [`${price} ${priceWords[kind]}`];
  });
  if (parts.length === 0) {
    return isWeb ? PlusAccess_prices : PlusAccess_pricesInStore;
  }
  if (parts.length === 1) {
    return `${parts[0]}.`;
  }
  const last = parts[parts.length - 1];
  const head = parts.slice(0, -1).join(", ");
  return parts.length === 2 ? `${head} or ${last}.` : `${head}, or ${last}.`;
}

export function PlusAccess_list(tier: IPlusTier, caps?: IAiCapsPlan): IPlusFeatureInfo[] {
  return features
    .filter((f) => f.tier === tier)
    .map((f) => (f.key === "ai" ? { ...f, ...AiCaps_plusFeature(caps) } : f));
}

export function PlusAccess_needsPlus(feature: IPlusFeature): boolean {
  return features.some((f) => f.key === feature && f.tier === "plus");
}

export function PlusAccess_hasPlus(plan: IAccountPlanState, sessionUserId: string | undefined): boolean {
  return AccountPlan_isPlus(plan, sessionUserId);
}

export function PlusAccess_allows(
  feature: IPlusFeature,
  plan: IAccountPlanState,
  sessionUserId: string | undefined
): boolean {
  return !PlusAccess_needsPlus(feature) || PlusAccess_hasPlus(plan, sessionUserId);
}

export function PlusAccess_screenFeature(screen: string): IPlusFeature | undefined {
  return screenFeatures[screen];
}
