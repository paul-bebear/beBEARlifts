import { AccountPlan_isPlus, IAccountPlanState } from "./accountPlan";

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

export interface IPlusAccountRow {
  title: string;
  subtitle: string;
  actionLabel: string;
}

// Decided 2026-10-25: anything that logs is free. Anything that analyzes, uses AI or connects to another tool is beBEAR+.
const features: IPlusFeatureInfo[] = [
  {
    key: "ai",
    tier: "plus",
    title: "150 AI uses a week",
    description: "30 a day instead of 3. Meal photos, meal text, nutrition labels, body scans and the AI warm-up.",
  },
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

export function PlusAccess_list(tier: IPlusTier): IPlusFeatureInfo[] {
  return features.filter((f) => f.tier === tier);
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

export function PlusAccess_accountRow(hasPlus: boolean): IPlusAccountRow {
  return hasPlus
    ? { title: "beBEAR+ is on", subtitle: "Insights, AI and the API are unlocked", actionLabel: "View" }
    : { title: "Free plan", subtitle: "Tracking is free for everyone", actionLabel: "Get beBEAR+" };
}
