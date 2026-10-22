import { BearPlace_equipmentKeys, BearPlace_resolve } from "./bearPlace";
import { FoodTargets_activities, FoodTargets_goals } from "./foodTargets";
import {
  IOnboardingContext,
  IOnboardingStepDef,
  OnboardingSteps_forecast,
  OnboardingSteps_liftKg,
} from "./onboardingSteps";
import { BearTier_all, BearTier_setFor } from "./bearTier";

function hi(ctx: IOnboardingContext): string {
  const name = ctx.answers.name.trim();
  return name === "" ? "" : `, ${name}`;
}

function picked(ctx: IOnboardingContext, id: string): string[] {
  return ctx.extras[id] ?? [];
}

const equipmentNames: Record<string, string> = {
  barbell: "barbell",
  dumbbell: "dumbbells",
  cable: "cables",
  leverageMachine: "machines",
  smith: "Smith machine",
  ezbar: "EZ bar",
  trapbar: "trap bar",
  kettlebell: "kettlebells",
  bodyweight: "your bodyweight",
};

function equipmentLine(ctx: IOnboardingContext): string {
  const keys = BearPlace_equipmentKeys(BearPlace_resolve(ctx.answers.places));
  return keys.map((key) => equipmentNames[key] ?? key).join(", ");
}

function liftLine(ctx: IOnboardingContext): string {
  const kg = OnboardingSteps_liftKg(ctx);
  const teen = BearTier_all(BearTier_setFor(ctx.answers.sex, ctx.answers.bearLine))[1];
  return kg == null
    ? `Every kg you lift counts. I need ${teen.minKg.toLocaleString("en-US")} kg to become a ${teen.name}.`
    : `That set moved ${kg.toLocaleString("en-US")} kg. I need ${teen.minKg.toLocaleString("en-US")} kg to become a ${teen.name}.`;
}

function forecastLine(ctx: IOnboardingContext): string {
  const days = ctx.answers.days ?? 3;
  const forecast = OnboardingSteps_forecast(ctx, days);
  if (forecast == null) {
    return "Train a few times a week and watch me grow.";
  }
  const date = new Date(forecast.date).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return `At ${days} workouts a week I reach ${forecast.level.name} around ${date}.`;
}

const goalLines: Record<string, string> = {
  size: "Size it is. That means 8 to 12 reps and eating enough.",
  strength: "Strength it is. Heavy sets, fewer reps, long rests.",
  both: "Both it is. A heavy lift first, then muscle work.",
};

const stopLines: Record<string, string> = {
  unsure: "Not sure what to do? I tell you every set.",
  time: "No time? Every plan fits in about 45 minutes.",
  consistent: "Hard to stay consistent? I get tired when you skip, so you'll want to come back.",
  alone: "No one to train with? Add friends later and grow your bears together.",
  pain: "Pain? Start light. You can swap any exercise.",
};

export const OnboardingStepList_all: readonly IOnboardingStepDef[] = [
  { id: "start", kind: "signIn", variant: "start", bear: "normal", say: "Hi! Ready to grow a bear?" },
  {
    id: "levels",
    kind: "say",
    look: "intro",
    art: "levels",
    bear: "normal",
    title: "Climb 12 levels, from Cub to Mars",
    say: "",
  },
  {
    id: "growth",
    kind: "say",
    look: "intro",
    art: "growth",
    bear: "normal",
    title: "Every set makes your bear bigger",
    say: "",
  },
  {
    id: "planPreview",
    kind: "say",
    look: "intro",
    art: "plan",
    bear: "normal",
    title: "A plan made for you. No guessing.",
    say: "",
  },
  {
    id: "foodPreview",
    kind: "say",
    look: "intro",
    art: "food",
    bear: "hungry",
    title: "Log meals to keep your bear fed",
    say: "",
  },
  {
    id: "meet",
    kind: "say",
    art: "cub",
    bear: "normal",
    say: "I'm your bear. Answer a few questions and I'll build your plan.",
    button: "Sounds good!",
  },

  { id: "name", kind: "text", field: "name", label: "Your name", bear: "normal", say: "What should I call you?" },
  {
    id: "experience",
    kind: "choice",
    field: "experience",
    bear: "normal",
    say: (ctx) => `Nice to meet you${hi(ctx)}! How much have you trained?`,
    options: [
      { id: "never", label: "Never trained", icon: "▁", value: "new" },
      { id: "tried", label: "Tried it before", icon: "▂", value: "new" },
      { id: "months", label: "A few months", icon: "▃", value: "months" },
      { id: "years", label: "Years", icon: "▅", value: "years" },
    ],
  },
  {
    id: "goal",
    kind: "choice",
    field: "goal",
    bear: "normal",
    say: "What do you want most?",
    options: [
      { id: "size", label: "Get bigger", detail: "More muscle", icon: "💪", value: "size" },
      { id: "strength", label: "Get stronger", detail: "Lift heavier", icon: "🏋️", value: "strength" },
      { id: "both", label: "Both", detail: "Heavy first lift, then muscle work", icon: "🔥", value: "both" },
    ],
  },
  {
    id: "agile",
    kind: "choice",
    field: "agile",
    bear: "normal",
    say: "Want to be quicker on your feet too?",
    options: [
      { id: "yes", label: "Yes, add agility", detail: "Jumps and quick feet", icon: "⚡", value: true },
      { id: "no", label: "No, just lifting", icon: "🏋️", value: false },
    ],
  },
  {
    id: "goalCheer",
    kind: "say",
    look: "story",
    bear: "pumped",
    title: "You're in the right place!",
    say: (ctx) => goalLines[ctx.answers.goal] ?? goalLines.size,
  },
  {
    id: "why",
    kind: "choice",
    field: "extra",
    multi: true,
    bear: "normal",
    say: "Why do you want to train?",
    options: [
      { id: "confidence", label: "Feel more confident", icon: "😎", value: "confidence" },
      { id: "looks", label: "Look better", icon: "🪞", value: "looks" },
      { id: "sport", label: "Get better at a sport", icon: "⚽", value: "sport" },
      { id: "health", label: "Be healthier", icon: "❤️", value: "health" },
      { id: "noticed", label: "Get noticed", icon: "✨", value: "noticed" },
      { id: "other", label: "Other", icon: "💬", value: "other" },
    ],
  },
  {
    id: "stops",
    kind: "choice",
    field: "extra",
    multi: true,
    bear: "normal",
    say: "What usually stops you?",
    options: [
      { id: "unsure", label: "I don't know what to do", icon: "🤔", value: "unsure" },
      { id: "time", label: "No time", icon: "⏰", value: "time" },
      { id: "consistent", label: "Hard to stay consistent", icon: "📉", value: "consistent" },
      { id: "alone", label: "No one to train with", icon: "🙋", value: "alone" },
      { id: "pain", label: "Pain or an old injury", icon: "🩹", value: "pain" },
      { id: "other", label: "Other", icon: "💬", value: "other" },
    ],
  },
  {
    id: "stopsCheer",
    kind: "say",
    look: "story",
    bear: "pumped",
    title: "I've got you.",
    say: (ctx) =>
      stopLines[picked(ctx, "stops").find((id) => stopLines[id] != null) ?? ""] ?? "We'll take it one set at a time.",
  },
  {
    id: "promise",
    kind: "hold",
    bear: "pumped",
    title: "I will use beBEAR to…",
    say: "train my bear and grow with it.",
    holdMs: 2000,
  },

  {
    id: "found",
    kind: "choice",
    field: "extra",
    bear: "normal",
    say: "How did you find beBEAR?",
    options: [
      { id: "tiktok", label: "TikTok", icon: "🎵", value: "tiktok" },
      { id: "instagram", label: "Instagram", icon: "📸", value: "instagram" },
      { id: "friend", label: "A friend", icon: "🧑‍🤝‍🧑", value: "friend" },
      { id: "store", label: "App Store", icon: "🛍️", value: "store" },
      { id: "youtube", label: "YouTube", icon: "▶️", value: "youtube" },
      { id: "other", label: "Other", icon: "💬", value: "other" },
    ],
  },
  {
    id: "foundHow",
    kind: "choice",
    field: "extra",
    bear: "normal",
    say: "Was it an ad or a creator?",
    when: (ctx) => ["tiktok", "instagram"].includes(picked(ctx, "found")[0] ?? ""),
    options: [
      { id: "ad", label: "An ad", icon: "📣", value: "ad" },
      { id: "creator", label: "A creator", icon: "🎥", value: "creator" },
      { id: "other", label: "Something else", icon: "💬", value: "other" },
    ],
  },
  {
    id: "creator",
    kind: "text",
    field: "extra",
    label: "Creator's name",
    bear: "normal",
    say: "Which creator? You can skip this.",
    when: (ctx) =>
      ["tiktok", "instagram"].includes(picked(ctx, "found")[0] ?? "") && picked(ctx, "foundHow")[0] === "creator",
  },
  {
    id: "friend",
    kind: "text",
    field: "invite",
    label: "Friend's handle",
    bear: "normal",
    say: "What's your friend's handle? You can skip this.",
    when: (ctx) => picked(ctx, "found")[0] === "friend",
  },
  {
    id: "sex",
    kind: "choice",
    field: "sex",
    bear: "normal",
    say: "Are you male or female? I use it for food targets.",
    options: [
      { id: "male", label: "Male", icon: "♂️", value: "male" },
      { id: "female", label: "Female", icon: "♀️", value: "female" },
      { id: "skip", label: "Rather not say", icon: "🤐", value: undefined },
    ],
  },
  { id: "height", kind: "measure", measure: "height", bear: "normal", say: "How tall are you?" },
  {
    id: "weight",
    kind: "measure",
    measure: "weight",
    bear: "normal",
    say: "How much do you weigh? I use it for food targets.",
  },
  { id: "age", kind: "measure", measure: "age", bear: "normal", say: "How old are you?" },
  {
    id: "activity",
    kind: "choice",
    field: "activity",
    bear: "normal",
    say: "How active are you on a normal day?",
    options: [
      ...FoodTargets_activities.map((a) => ({ id: a.key, label: a.label, detail: a.detail, value: a.key })),
      { id: "skip", label: "Skip food targets", value: undefined },
    ],
  },
  {
    id: "foodGoal",
    kind: "choice",
    field: "foodGoal",
    bear: "hungry",
    say: "Do you want to gain, keep or lose weight?",
    options: [
      ...FoodTargets_goals.map((g) => ({ id: g.key, label: g.label, detail: g.detail, value: g.key })),
      { id: "skip", label: "Skip food targets", value: undefined },
    ],
  },

  {
    id: "aboutYou",
    kind: "say",
    look: "story",
    bear: "normal",
    title: "This is about you.",
    say: "And about me, your bear.",
  },
  { id: "meetProperly", kind: "say", look: "story", bear: "normal", title: "Let's meet properly.", say: "" },
  { id: "meetCub", kind: "say", art: "cub", bear: "normal", say: "This is me now. Level 1, Cub." },
  {
    id: "meetGrowth",
    kind: "say",
    art: "growth",
    bear: "pumped",
    say: "Lift and I grow. Train long enough and I end up on Mars.",
  },
  { id: "meetOutfits", kind: "say", art: "outfits", bear: "normal", say: "You'll unlock outfits for me as you go." },
  {
    id: "bearLine",
    kind: "choice",
    field: "bearLine",
    grid: true,
    bear: "normal",
    say: "Which bear is yours?",
    options: [
      { id: "male", label: "Him", value: "male" },
      { id: "female", label: "Her", value: "female" },
    ],
  },
  { id: "team", kind: "say", art: "cub", bear: "pumped", say: "Nice. We're a team now.", button: "Continue" },

  {
    id: "thinkFit",
    kind: "choice",
    field: "extra",
    bear: "normal",
    say: "How often do you think about getting fit?",
    options: [
      { id: "rarely", label: "Rarely", icon: "▁", value: "rarely" },
      { id: "sometimes", label: "Sometimes", icon: "▃", value: "sometimes" },
      { id: "often", label: "Often", icon: "▅", value: "often" },
      { id: "always", label: "All the time", icon: "▇", value: "always" },
    ],
  },
  {
    id: "energy",
    kind: "choice",
    field: "extra",
    grid: true,
    bear: "tired",
    say: "How is your energy in a workout?",
    options: [
      { id: "low", label: "Tired all day", icon: "🪫", value: "low" },
      { id: "drops", label: "Drops halfway", icon: "🔋", value: "drops" },
      { id: "end", label: "Fades at the end", icon: "🔋", value: "end" },
      { id: "steady", label: "Steady the whole time", icon: "⚡", value: "steady" },
    ],
  },
  {
    id: "seeProgress",
    kind: "choice",
    field: "extra",
    grid: true,
    bear: "normal",
    title: "It's hard to see my progress.",
    say: "Is this you?",
    options: [
      { id: "yes", label: "Yes", icon: "✓", value: "yes" },
      { id: "no", label: "No", icon: "✕", value: "no" },
    ],
  },
  {
    id: "sameWorkout",
    kind: "choice",
    field: "extra",
    grid: true,
    bear: "normal",
    title: "I repeat the same workout and don't know what's missing.",
    say: "Is this you?",
    options: [
      { id: "yes", label: "Yes", icon: "✓", value: "yes" },
      { id: "no", label: "No", icon: "✕", value: "no" },
    ],
  },
  {
    id: "pushHarder",
    kind: "choice",
    field: "extra",
    grid: true,
    bear: "normal",
    title: "I could push harder than I do.",
    say: "Is this you?",
    options: [
      { id: "yes", label: "Yes", icon: "✓", value: "yes" },
      { id: "no", label: "No", icon: "✕", value: "no" },
    ],
  },
  {
    id: "noPlan",
    kind: "say",
    look: "story",
    art: "mirror",
    bear: "tired",
    title: "Progress feels invisible",
    say: "You show up and you lift, but nothing seems to change. Training without a plan feels slow.",
  },
  {
    id: "enough",
    kind: "say",
    look: "story",
    art: "tired",
    bear: "tired",
    title: "Guessing holds you back",
    say: "Without a plan it's hard to know if you're doing enough, or the right things.",
  },
  {
    id: "answer",
    kind: "say",
    look: "story",
    art: "growth",
    bear: "pumped",
    title: "Watch yourself grow",
    say: "I show your progress. Every kg you lift makes me bigger.",
  },

  {
    id: "places",
    kind: "choice",
    field: "places",
    multi: true,
    bear: "normal",
    say: "Where do you train? Pick all that fit.",
    options: [
      { id: "gym", label: "Full gym", icon: "🏢", value: "gym" },
      { id: "dumbbells", label: "Only dumbbells", icon: "🏠", value: "dumbbells" },
      { id: "street", label: "Street workout bars", icon: "🌳", value: "street" },
      { id: "none", label: "No equipment", icon: "🧍", value: "none" },
    ],
  },
  {
    id: "equipment",
    kind: "say",
    bear: "normal",
    say: (ctx) => `Your equipment: ${equipmentLine(ctx)}. You can change it any time in Settings.`,
  },
  {
    id: "source",
    kind: "choice",
    field: "source",
    bear: "normal",
    say: "Want me to build your plan?",
    options: [
      {
        id: "recommend",
        label: "Yes, build me a plan",
        detail: "A full plan that fits your goal and your week",
        icon: "📋",
        value: "recommend",
      },
      {
        id: "import",
        label: "No, I have my own",
        detail: "Bring your plan in from screenshots",
        icon: "📲",
        value: "import",
      },
    ],
  },
  {
    id: "styles",
    kind: "choice",
    field: "extra",
    multi: true,
    bear: "normal",
    say: "What kind of training do you like?",
    options: [
      { id: "bodybuilding", label: "Muscle building", value: "bodybuilding" },
      { id: "powerlifting", label: "Powerlifting", value: "powerlifting" },
      { id: "calisthenics", label: "Calisthenics", value: "calisthenics" },
      { id: "circuits", label: "Circuits", value: "circuits" },
      { id: "unsure", label: "Not sure", value: "unsure", only: true },
    ],
  },
  {
    id: "focus",
    kind: "choice",
    field: "extra",
    multi: true,
    bear: "normal",
    say: "Any muscles you want to focus on?",
    options: [
      { id: "chest", label: "Chest", value: "chest" },
      { id: "back", label: "Back", value: "back" },
      { id: "arms", label: "Arms", value: "arms" },
      { id: "shoulders", label: "Shoulders", value: "shoulders" },
      { id: "legs", label: "Legs", value: "legs" },
      { id: "abs", label: "Abs", value: "abs" },
      { id: "all", label: "All of it", value: "all", only: true },
    ],
  },
  {
    id: "length",
    kind: "choice",
    field: "extra",
    bear: "normal",
    say: "How long can a workout be?",
    options: [
      { id: "30", label: "30 minutes", detail: "Short", value: "30" },
      { id: "45", label: "45 minutes", detail: "Normal", value: "45" },
      { id: "60", label: "60 minutes", detail: "Long", value: "60" },
      { id: "90", label: "90 minutes", detail: "Very long", value: "90" },
    ],
  },
  {
    id: "days",
    kind: "choice",
    field: "days",
    bear: "normal",
    say: "How many days a week can you train?",
    options: [
      { id: "2", label: "2 days a week", detail: "A start", value: 2 },
      { id: "3", label: "3 days a week", detail: "Good", value: 3 },
      { id: "4", label: "4 days a week", detail: "Great", value: 4 },
      { id: "5", label: "5 days a week", detail: "Serious", value: 5 },
      { id: "6", label: "6 days a week", detail: "All in", value: 6 },
    ],
  },
  {
    id: "weekdays",
    kind: "choice",
    field: "extra",
    multi: true,
    min: (ctx) => ctx.answers.days ?? 1,
    bear: "normal",
    say: (ctx) => `Which days work for you? Pick at least ${ctx.answers.days ?? 1}.`,
    options: [
      { id: "mon", label: "Monday", value: "mon" },
      { id: "tue", label: "Tuesday", value: "tue" },
      { id: "wed", label: "Wednesday", value: "wed" },
      { id: "thu", label: "Thursday", value: "thu" },
      { id: "fri", label: "Friday", value: "fri" },
      { id: "sat", label: "Saturday", value: "sat" },
      { id: "sun", label: "Sunday", value: "sun" },
    ],
  },
  {
    id: "hurts",
    kind: "choice",
    field: "extra",
    multi: true,
    grid: true,
    bear: "normal",
    say: "Does anything hurt?",
    options: [
      { id: "back", label: "Lower back", icon: "🩹", value: "back" },
      { id: "shoulders", label: "Shoulders", icon: "🩹", value: "shoulders" },
      { id: "knees", label: "Knees", icon: "🩹", value: "knees" },
      { id: "wrists", label: "Wrists", icon: "🩹", value: "wrists" },
      { id: "elbows", label: "Elbows", icon: "🩹", value: "elbows" },
      { id: "nothing", label: "Nothing", icon: "👍", value: "nothing", only: true },
    ],
  },

  {
    id: "building",
    kind: "loading",
    bear: "normal",
    title: "Building your plan…",
    say: "",
    ms: 2500,
    bars: ["Your goal", "Your week", "Your equipment"],
  },
  {
    id: "plans",
    kind: "plans",
    bear: "pumped",
    say: (ctx) => `Here's your plan${hi(ctx)}!`,
    when: (ctx) => ctx.source !== "import",
  },
  {
    id: "reminder",
    kind: "permission",
    permission: "reminder",
    bear: "normal",
    say: "Want a reminder on training days?",
  },
  { id: "widget", kind: "say", art: "widget", bear: "normal", say: "Put me on your Home Screen. I'll cheer you on." },
  {
    id: "widgetHold",
    kind: "say",
    art: "widget",
    bear: "normal",
    say: "Press and hold an empty spot on your Home Screen.",
    when: (ctx) => ctx.platform === "ios",
  },
  {
    id: "widgetEdit",
    kind: "say",
    art: "widget",
    bear: "normal",
    say: "Tap Edit in the top corner, then Add Widget.",
    when: (ctx) => ctx.platform === "ios",
  },
  {
    id: "widgetAdd",
    kind: "say",
    art: "widget",
    bear: "normal",
    say: "Search for beBEAR and add me.",
    when: (ctx) => ctx.platform === "ios",
  },
  {
    id: "others",
    kind: "say",
    look: "story",
    art: "levels",
    bear: "pumped",
    title: "You're not alone",
    say: "Lifters like you are growing their bears right now.",
  },

  { id: "lift", kind: "lift", bear: "normal", say: "What's a set you did recently? You can skip this." },
  { id: "liftResult", kind: "result", result: "lift", bear: "pumped", say: liftLine },
  {
    id: "forecast",
    kind: "say",
    look: "story",
    art: "forecast",
    bear: "pumped",
    title: "You can grow fast",
    say: forecastLine,
  },
  {
    id: "settingUp",
    kind: "loading",
    bear: "normal",
    title: "Setting everything up",
    say: "",
    ms: 3000,
    bars: ["Your bear", "Your plan", "Your food targets"],
  },
  { id: "growKg", kind: "say", art: "growth", bear: "pumped", say: "I grow with every kg you lift." },
  { id: "feedMe", kind: "say", art: "food", bear: "hungry", say: "Feed me by logging your meals." },
  {
    id: "neverSmaller",
    kind: "say",
    art: "cub",
    bear: "tired",
    say: "Miss a day and I get tired. I never get smaller.",
  },

  {
    id: "free",
    kind: "say",
    look: "story",
    art: "cub",
    bear: "pumped",
    title: "Tracking is free. Forever.",
    say: "Every workout and every meal. No trial, no catch.",
  },
  {
    id: "plusPitch",
    kind: "say",
    look: "story",
    bear: "normal",
    title: "beBEAR+",
    say: "beBEAR+ adds AI: meal scans, warmups and workout reports.",
  },
  {
    id: "plusLater",
    kind: "say",
    look: "story",
    bear: "normal",
    title: "Try beBEAR+ any time",
    say: "You can start it later from Settings.",
    button: "Got it",
  },
  { id: "plusInside", kind: "say", bear: "pumped", say: "Let me show you what's inside beBEAR+." },
  { id: "plusScan", kind: "say", art: "food", bear: "hungry", say: "Snap a meal and I count the calories." },
  { id: "plusWarmup", kind: "say", bear: "normal", say: "I can plan your warmup from today's workout." },
  { id: "plusReport", kind: "say", bear: "pumped", say: "After each workout you get a report on how it went." },
  { id: "plusDescribe", kind: "say", art: "food", bear: "hungry", say: "Type what you ate. I work out the macros." },
  { id: "plusOutfits", kind: "say", art: "outfits", bear: "normal", say: "Some outfits are beBEAR+ only." },
  { id: "plusDone", kind: "say", bear: "pumped", say: "That's beBEAR+." },

  { id: "badge", kind: "result", result: "badge", bear: "pumped", say: "Setup done. First badge unlocked!" },
  {
    id: "health",
    kind: "permission",
    permission: "health",
    bear: "normal",
    say: "Connect Apple Health so your workouts show up there too?",
    when: (ctx) => ctx.platform === "ios",
  },
  { id: "save", kind: "signIn", variant: "save", bear: "normal", say: "Save your bear so you never lose it." },
  {
    id: "welcome",
    kind: "say",
    art: "cub",
    bear: "pumped",
    say: (ctx) => `Welcome${hi(ctx)}! Let's do your first workout.`,
    button: "Start my first workout",
  },
];
