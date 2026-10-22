import { IEquipment } from "../types";
import { IBearPlace, BearPlace_order } from "./bearPlace";

export type IBearSlot =
  | "squat"
  | "squat2"
  | "hinge"
  | "rdl"
  | "glute"
  | "lunge"
  | "bss"
  | "quad"
  | "legCurl"
  | "calf"
  | "abductor"
  | "core"
  | "crunch"
  | "backExt"
  | "horizontalPush"
  | "inclinePush"
  | "verticalPush"
  | "chestFly"
  | "lateral"
  | "rearDelt"
  | "facePull"
  | "verticalPull"
  | "pullUp"
  | "horizontalPull"
  | "cableRow"
  | "curl"
  | "curl2"
  | "triceps"
  | "triceps2"
  | "cardio"
  | "hipOpener"
  | "thoracic"
  | "hamstringReach"
  | "jumpSquat"
  | "lateralJump"
  | "jumpRope";

export type IBearSlotKind = "compound" | "isolation" | "cardio" | "mobility" | "agility";

export interface IBearPick {
  name: string;
  equipment: IEquipment;
  lb: number;
  step?: number;
  sets?: string;
  note?: string;
}

export interface IBearSlotRow {
  kind: IBearSlotKind;
  picks: Partial<Record<IBearPlace, IBearPick>>;
}

function bw(name: string, note?: string): IBearPick {
  return { name, equipment: "bodyweight", lb: 0, note };
}

const tableRow = "Use a low bar, or lie under a sturdy table and pull your chest to the edge.";
const pullUpNote = "Hit 3x12? Add a backpack with books and log its weight.";

export const BearPlanSlots_table: Record<IBearSlot, IBearSlotRow> = {
  squat: {
    kind: "compound",
    picks: {
      gym: { name: "Squat", equipment: "barbell", lb: 95, step: 10 },
      dumbbells: { name: "Goblet Squat", equipment: "dumbbell", lb: 30 },
      floor: bw("Squat, Bodyweight"),
    },
  },
  squat2: {
    kind: "compound",
    picks: {
      gym: { name: "Leg Press", equipment: "leverageMachine", lb: 180, step: 10 },
      dumbbells: { name: "Squat, Dumbbell", equipment: "dumbbell", lb: 25 },
      floor: bw("Split Squat, Bodyweight"),
    },
  },
  hinge: {
    kind: "compound",
    picks: {
      gym: { name: "Deadlift", equipment: "barbell", lb: 135, step: 10 },
      dumbbells: { name: "Romanian Deadlift", equipment: "dumbbell", lb: 40 },
      floor: bw("Single Leg Deadlift, Bodyweight"),
    },
  },
  rdl: {
    kind: "compound",
    picks: {
      gym: { name: "Romanian Deadlift, Barbell", equipment: "barbell", lb: 95, step: 10 },
      dumbbells: { name: "Single Leg Deadlift", equipment: "dumbbell", lb: 25 },
      floor: bw("Romanian Deadlift, Bodyweight"),
    },
  },
  glute: {
    kind: "compound",
    picks: {
      gym: { name: "Hip Thrust", equipment: "barbell", lb: 95, step: 10 },
      dumbbells: { name: "Glute Bridge", equipment: "dumbbell", lb: 40 },
      floor: bw("Hip Thrust, Bodyweight", "Shoulders on a couch or a bed."),
    },
  },
  lunge: {
    kind: "compound",
    picks: {
      gym: { name: "Lunge, Dumbbell", equipment: "dumbbell", lb: 20 },
      dumbbells: { name: "Lunge, Dumbbell", equipment: "dumbbell", lb: 20 },
      floor: bw("Reverse Lunge, Bodyweight"),
    },
  },
  bss: {
    kind: "compound",
    picks: {
      gym: { name: "Bulgarian Split Squat", equipment: "dumbbell", lb: 20 },
      dumbbells: { name: "Bulgarian Split Squat", equipment: "dumbbell", lb: 20 },
      floor: bw("Bulgarian Split Squat, Bodyweight", "Back foot on a chair or a bench."),
    },
  },
  quad: {
    kind: "isolation",
    picks: {
      gym: { name: "Leg Extension", equipment: "leverageMachine", lb: 60 },
      dumbbells: { name: "Step up", equipment: "dumbbell", lb: 15 },
      floor: bw("Step up, Bodyweight", "Use a stair or a sturdy chair."),
    },
  },
  legCurl: {
    kind: "isolation",
    picks: {
      gym: { name: "Seated Leg Curl", equipment: "leverageMachine", lb: 60 },
      floor: bw("Single Leg Glute Bridge Straight Leg"),
    },
  },
  calf: {
    kind: "isolation",
    picks: {
      gym: { name: "Calf Press on Leg Press", equipment: "leverageMachine", lb: 90 },
      dumbbells: { name: "Standing Calf Raise", equipment: "dumbbell", lb: 30 },
      floor: bw("Standing Calf Raise, Bodyweight", "Stand on a step and let the heels drop."),
    },
  },
  abductor: {
    kind: "isolation",
    picks: {
      gym: { name: "Hip Abductor", equipment: "leverageMachine", lb: 60 },
      floor: bw("Side Lying Clam"),
    },
  },
  core: {
    kind: "isolation",
    picks: {
      gym: { name: "Cable Crunch", equipment: "cable", lb: 40 },
      street: bw("Hanging Knee Raise"),
      floor: bw("Dead Bug"),
    },
  },
  crunch: { kind: "isolation", picks: { floor: bw("Reverse Crunch") } },
  backExt: {
    kind: "isolation",
    picks: { floor: bw("Back Extension, Bodyweight", "Lie face down, lift chest and legs.") },
  },
  horizontalPush: {
    kind: "compound",
    picks: {
      gym: { name: "Bench Press", equipment: "barbell", lb: 95 },
      dumbbells: {
        name: "Bench Press, Dumbbell",
        equipment: "dumbbell",
        lb: 30,
        note: "No bench? Press from the floor.",
      },
      floor: bw("Push Up"),
    },
  },
  inclinePush: {
    kind: "compound",
    picks: {
      gym: { name: "Incline Bench Press, Dumbbell", equipment: "dumbbell", lb: 30 },
      floor: bw("Incline Push Up", "Hands on a table or a bench."),
    },
  },
  verticalPush: {
    kind: "compound",
    picks: {
      gym: { name: "Overhead Press", equipment: "barbell", lb: 65 },
      dumbbells: { name: "Shoulder Press", equipment: "dumbbell", lb: 20 },
      floor: bw("Pike Push Up"),
    },
  },
  chestFly: {
    kind: "isolation",
    picks: {
      gym: { name: "Chest Fly, Cable", equipment: "cable", lb: 15 },
      dumbbells: { name: "Chest Fly", equipment: "dumbbell", lb: 15 },
      street: bw("Chest Dip"),
    },
  },
  lateral: {
    kind: "isolation",
    picks: {
      gym: { name: "Lateral Raise, Cable", equipment: "cable", lb: 10 },
      dumbbells: { name: "Lateral Raise", equipment: "dumbbell", lb: 10 },
    },
  },
  rearDelt: {
    kind: "isolation",
    picks: {
      gym: { name: "Reverse Fly, Leverage Machine", equipment: "leverageMachine", lb: 50 },
      dumbbells: { name: "Reverse Fly", equipment: "dumbbell", lb: 10 },
      floor: bw("Superman"),
    },
  },
  facePull: {
    kind: "isolation",
    picks: { gym: { name: "Standing Row Rear Delt With Rope", equipment: "cable", lb: 30 } },
  },
  verticalPull: {
    kind: "compound",
    picks: {
      gym: { name: "Lat Pulldown", equipment: "cable", lb: 70 },
      dumbbells: { name: "Pullover", equipment: "dumbbell", lb: 25 },
      street: bw("Pull Up", pullUpNote),
      floor: bw("Vertical Row", "Hold a door frame, or a towel looped round a post, lean back and pull."),
    },
  },
  pullUp: {
    kind: "compound",
    picks: {
      gym: bw("Pull Up", pullUpNote),
      street: bw("Pull Up", pullUpNote),
      floor: bw("Vertical Row", "Hold a door frame, or a towel looped round a post, lean back and pull."),
    },
  },
  horizontalPull: {
    kind: "compound",
    picks: {
      gym: { name: "Bent Over Row", equipment: "barbell", lb: 75 },
      dumbbells: { name: "Bent Over One Arm Row", equipment: "dumbbell", lb: 30 },
      floor: bw("Inverted Row", tableRow),
    },
  },
  cableRow: {
    kind: "compound",
    picks: {
      gym: { name: "Seated Row", equipment: "cable", lb: 70 },
      dumbbells: { name: "Bent Over Row, Dumbbell", equipment: "dumbbell", lb: 25 },
      floor: bw("Wide Row", tableRow),
    },
  },
  curl: {
    kind: "isolation",
    picks: {
      gym: { name: "Preacher Curl", equipment: "dumbbell", lb: 20 },
      dumbbells: { name: "Bicep Curl", equipment: "dumbbell", lb: 15 },
      street: bw("Chin Up"),
    },
  },
  curl2: {
    kind: "isolation",
    picks: {
      gym: { name: "Hammer Curl", equipment: "dumbbell", lb: 20 },
      dumbbells: { name: "Hammer Curl", equipment: "dumbbell", lb: 15 },
    },
  },
  triceps: {
    kind: "isolation",
    picks: {
      gym: { name: "Triceps Pushdown", equipment: "cable", lb: 40 },
      dumbbells: { name: "Skullcrusher, Dumbbell", equipment: "dumbbell", lb: 15 },
      street: bw("Triceps Dip"),
      floor: bw("Diamond Push Up"),
    },
  },
  triceps2: {
    kind: "isolation",
    picks: {
      gym: { name: "Triceps Extension", equipment: "dumbbell", lb: 20 },
      dumbbells: { name: "Triceps Extension", equipment: "dumbbell", lb: 15 },
      floor: bw("Bench Dip", "Hands on a chair behind you."),
    },
  },
  cardio: {
    kind: "cardio",
    picks: {
      gym: bw("Cycling", "Bike or treadmill, 10 easy minutes. You should still be able to talk."),
      floor: bw("High Knee Skips", "10 easy minutes. A jog outside counts too."),
    },
  },
  hipOpener: {
    kind: "mobility",
    picks: { floor: bw("Assisted Squat", "Sit in a deep squat. Hold a door frame for balance.") },
  },
  thoracic: {
    kind: "mobility",
    picks: { floor: bw("Russian Twist", "Slow, no weight. Sit tall and turn your chest side to side.") },
  },
  hamstringReach: {
    kind: "mobility",
    picks: { floor: bw("Single Leg Deadlift, Bodyweight", "Slow reach to the floor. Feel the back of the leg.") },
  },
  jumpSquat: { kind: "agility", picks: { floor: bw("Jump Squat, Bodyweight") } },
  lateralJump: {
    kind: "agility",
    picks: { floor: bw("Lateral Box Jump, Bodyweight", "No box? Jump side to side over a line.") },
  },
  jumpRope: {
    kind: "agility",
    picks: {
      floor: { ...bw("Jump Rope", "No rope? Jump in place with the same rhythm."), sets: "3x1 0lb 30s|30s" },
    },
  },
};

export function BearPlanSlots_pick(slot: IBearSlot, places: IBearPlace[]): IBearPick | undefined {
  const row = BearPlanSlots_table[slot];
  for (const place of BearPlace_order) {
    const pick = row.picks[place];
    if (pick != null && (places.includes(place) || place === "floor")) {
      return pick;
    }
  }
  return undefined;
}
