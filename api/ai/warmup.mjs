import { json } from "../_food.mjs";
import { aiChat, aiProvider } from "../_ai.mjs";
import { AiAuth_check } from "../_auth.mjs";

// About 400 tokens in and 400 out, so one warmup is about $0.0003 on Claude Haiku 5.5.
const maxExercises = 12;
const maxFieldChars = 120;

const systemPrompt = `You are a strength coach. You write the general warmup for one gym session.
The user lists today's exercises in order, with the muscles each one trains and the first working set.
Write 4 to 7 items that take 5 to 8 minutes in total:
- Start with 2 to 3 minutes of easy cardio.
- Then dynamic mobility and activation for the muscles and joints today's first two exercises load most.
- Use only bodyweight, a light band, or an empty bar. No static stretches held over 20 seconds, and nothing to fatigue.
- End with one item named "Ramp-up sets" that tells the user to do the warmup sets the app shows for the first exercise.
Each "detail" is one short sentence with reps or time, written for someone standing in the gym.
Put "seconds" only on timed items.
Answer with JSON only, no other text, in this shape:
{"items":[{"name":"Easy bike","detail":"Easy pace, enough to get a little warm.","seconds":150},{"name":"Leg swings","detail":"10 front to back and 10 side to side, each leg."}]}`;

function clean(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxFieldChars) : "";
}

function describe(exercises) {
  return exercises
    .slice(0, maxExercises)
    .map((e, i) => {
      const muscles = Array.isArray(e?.muscles) ? e.muscles.map(clean).filter(Boolean).join(", ") : "";
      return `${i + 1}. ${clean(e?.name)} (${muscles || "muscles unknown"}): ${clean(e?.sets)}`;
    })
    .join("\n");
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Send JSON with an exercises list" }, 400);
  }
  const exercises = Array.isArray(body?.exercises) ? body.exercises.filter((e) => clean(e?.name) !== "") : [];
  if (exercises.length === 0) {
    return json({ error: "The workout has no exercises" }, 400);
  }
  const ai = await aiProvider();
  const denied = await AiAuth_check(request, ai);
  if (denied != null) {
    return denied;
  }
  const result = await aiChat(
    ai,
    {
      maxTokens: 700,
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Today's workout:\n${describe(exercises)}` },
      ],
    },
    30000
  );
  return result.ok ? json({ text: result.text }) : json({ error: result.error }, result.status);
}
