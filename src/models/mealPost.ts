import { INutrients } from "./foodLog";
import { FoodScanSteps_description, FoodScanSteps_totals, IScanServing } from "./foodScanSteps";

export interface IMealMacros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface IMealPostDraft {
  id: string;
  description: string;
  macros: IMealMacros;
}

export interface IMealPost extends IMealPostDraft {
  userId: string;
  postedAt: number;
  photoPath?: string;
  photoUrl?: string;
}

export const MealPost_bucket = "meal-photos";
export const MealPost_maxDescription = 200;
export const MealPost_photoUrlSeconds = 6 * 3600;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const maxMacro = 100000;

// The post id names the photo too, so it must be random. 16 bytes from crypto.getRandomValues make a v4 uuid.
export function MealPost_newId(bytes: Uint8Array): string {
  const b = Array.from(bytes.slice(0, 16));
  b[6] = 0x40 + (b[6] % 16);
  b[8] = 0x80 + (b[8] % 64);
  const hex = b.map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function MealPost_isId(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

function macro(value: unknown): number | undefined {
  return typeof value === "number" && isFinite(value) && value >= 0 && value <= maxMacro
    ? Math.round(value)
    : undefined;
}

export function MealPost_macros(nutrients: INutrients): IMealMacros {
  return {
    kcal: macro(nutrients.calories) ?? 0,
    protein: macro(nutrients.protein) ?? 0,
    carbs: macro(nutrients.carbs) ?? 0,
    fat: macro(nutrients.fat) ?? 0,
  };
}

export function MealPost_build(id: string, description: string, nutrients: INutrients): IMealPostDraft | undefined {
  const text = description.trim().slice(0, MealPost_maxDescription);
  return MealPost_isId(id) && text !== "" ? { id, description: text, macros: MealPost_macros(nutrients) } : undefined;
}

export interface IMealShareSwitch {
  enabled: boolean;
  note: string;
}

export function MealPost_shareSwitch(signedIn: boolean, hasHandle: boolean, isShared: boolean): IMealShareSwitch {
  if (!signedIn) {
    return { enabled: false, note: "Sign in to share meals with friends." };
  }
  if (!hasHandle) {
    return { enabled: false, note: "Pick a handle on the Friends screen to share meals." };
  }
  return {
    enabled: true,
    note: isShared ? "Friends see the photo, the description and the macros." : "Only you see this meal.",
  };
}

export function MealPost_fromServing(
  serving: IScanServing,
  shareSwitch: IMealShareSwitch,
  id: string
): IMealPostDraft | undefined {
  return serving.isShared === true && shareSwitch.enabled
    ? MealPost_build(id, FoodScanSteps_description(serving), FoodScanSteps_totals(serving))
    : undefined;
}

// The migration checks the same shape, so a row can never point at another user's photo.
export function MealPost_photoPath(userId: string, postId: string): string {
  return `${userId}/${postId}.jpg`;
}

export function MealPost_jpegBytes(dataUrl: string, decode: (base64: string) => string): Uint8Array | undefined {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (match == null) {
    return undefined;
  }
  let binary: string;
  try {
    binary = decode(match[1]);
  } catch {
    return undefined;
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function parseMacros(raw: unknown): IMealMacros | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  const kcal = macro(r.kcal);
  const protein = macro(r.protein);
  const carbs = macro(r.carbs);
  const fat = macro(r.fat);
  return kcal != null && protein != null && carbs != null && fat != null ? { kcal, protein, carbs, fat } : undefined;
}

export function MealPost_parseDraft(raw: unknown): IMealPostDraft | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  const macros = parseMacros(r.macros);
  const description = typeof r.description === "string" ? r.description.slice(0, MealPost_maxDescription) : "";
  return MealPost_isId(r.id) && macros != null && description.trim() !== ""
    ? { id: r.id, description, macros }
    : undefined;
}

// A friend's app writes the row, so every field is checked before the feed shows it.
// Accepts both the server's snake_case row and the app's own cached shape.
export function MealPost_parse(raw: unknown): IMealPost | undefined {
  const r = (raw ?? {}) as Record<string, unknown>;
  const draft = MealPost_parseDraft(r);
  const userId = r.user_id ?? r.userId;
  const postedAt =
    typeof r.posted_at === "string"
      ? Date.parse(r.posted_at)
      : typeof r.postedAt === "number"
        ? r.postedAt
        : Number.NaN;
  if (draft == null || typeof userId !== "string" || !isFinite(postedAt)) {
    return undefined;
  }
  const path = r.photo_path ?? r.photoPath;
  const photoPath = path === MealPost_photoPath(userId, draft.id) ? path : undefined;
  const photoUrl = photoPath != null && typeof r.photoUrl === "string" ? r.photoUrl : undefined;
  return {
    ...draft,
    userId,
    postedAt,
    ...(photoPath != null ? { photoPath } : {}),
    ...(photoUrl != null ? { photoUrl } : {}),
  };
}

// Storage answers POST /object/sign/<bucket> with [{ path, signedURL }], where signedURL starts at /object.
export function MealPost_withPhotoUrls(posts: IMealPost[], origin: string, signed: unknown): IMealPost[] {
  const urls = new Map<string, string>();
  for (const item of Array.isArray(signed) ? signed : []) {
    const r = (item ?? {}) as Record<string, unknown>;
    if (typeof r.path === "string" && typeof r.signedURL === "string" && r.signedURL.startsWith("/object/sign/")) {
      urls.set(r.path, `${origin}/storage/v1${r.signedURL}`);
    }
  }
  return posts.map((post) => {
    const url = post.photoPath != null ? urls.get(post.photoPath) : undefined;
    return url != null ? { ...post, photoUrl: url } : post;
  });
}

export function MealPost_macrosCard(macros: IMealMacros): { label: string; value: string }[] {
  return [
    { label: "kcal", value: macros.kcal.toLocaleString("en-US") },
    { label: "Protein", value: `${macros.protein} g` },
    { label: "Carbs", value: `${macros.carbs} g` },
    { label: "Fat", value: `${macros.fat} g` },
  ];
}
