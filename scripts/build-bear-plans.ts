import * as fs from "fs";
import * as path from "path";
import { BearPlan_text, IBearPlanParams } from "../src/models/bearPlan";

const catalog: { file: string; days: IBearPlanParams["days"] }[] = [
  { file: "bebear-3day.md", days: 3 },
  { file: "bebear-4day.md", days: 4 },
  { file: "bebear-ulppl.md", days: 5 },
];

const fence = /```liftoscript\n[\s\S]*?```/;

for (const { file, days } of catalog) {
  const filePath = path.resolve(__dirname, "../programs/builtin", file);
  const content = fs.readFileSync(filePath, "utf8");
  if (!fence.test(content)) {
    throw new Error(`${file} has no liftoscript fence`);
  }
  const text = BearPlan_text({ days, goal: "size", places: ["gym", "floor"], agile: false, youth: false });
  const updated = content.replace(fence, () => "```liftoscript\n" + text + "```");
  fs.writeFileSync(filePath, updated);
  console.log(`  ✓ ${file}`);
}
