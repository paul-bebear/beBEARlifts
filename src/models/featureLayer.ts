export type IFeature =
  | "workout"
  | "food"
  | "weight"
  | "bear"
  | "history"
  | "program"
  | "nutrition"
  | "consistency"
  | "graphs"
  | "exerciseStats"
  | "friends"
  | "honey"
  | "badges"
  | "notes"
  | "checkIn"
  | "music"
  | "runs"
  | "reports"
  | "measurements"
  | "bodyScans"
  | "steps"
  | "photos"
  | "seasons"
  | "volume";

export type IFeatureLayer = 1 | 2 | 3;

const layers: Record<IFeature, IFeatureLayer> = {
  workout: 1,
  food: 1,
  weight: 1,
  bear: 1,
  history: 2,
  program: 2,
  nutrition: 2,
  consistency: 2,
  graphs: 2,
  exerciseStats: 2,
  friends: 3,
  honey: 3,
  badges: 3,
  notes: 3,
  checkIn: 3,
  music: 3,
  runs: 3,
  reports: 3,
  measurements: 3,
  bodyScans: 3,
  steps: 3,
  photos: 3,
  seasons: 3,
  volume: 3,
};

export function FeatureLayer_of(feature: IFeature): IFeatureLayer {
  return layers[feature];
}

export function FeatureLayer_isFront(feature: IFeature): boolean {
  return layers[feature] === 1;
}
