import { fetchJson, json } from "../_food.mjs";
import { aiProvider } from "../_ai.mjs";
import { AiAuth_check } from "../_auth.mjs";

// About 300 tokens in and 150 out, so one summary is well under $0.001 on Claude Haiku 5.5.
const maxFacts = 20;
const maxFactChars = 300;

const systemPrompt = `You are a strength coach writing a short note after one gym session.
You get the session's name and a list of facts the app found, some with the lifter's own answer.
Write 2 to 4 short sentences in plain words, speaking to the lifter as "you".
- Lead with what went well, then what to watch.
- If the lifter said a lift hurt, tell them to go lighter or swap that lift next time, and to see a physio if the pain lasts or comes back. Never diagnose.
- If they said it was on purpose, accept it and move on.
- If a lift was too easy, say to add weight next time. If too hard, say to keep the weight.
- Use only the facts given. Do not invent numbers.
Answer with the note only, no greeting, no list, no markdown.`;

function clean(value, max) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Send JSON with a facts list" }, 400);
  }
  const facts = Array.isArray(body?.facts)
    ? body.facts
        .map((f) => clean(f, maxFactChars))
        .filter(Boolean)
        .slice(0, maxFacts)
    : [];
  if (facts.length === 0) {
    return json({ error: "The report has no facts" }, 400);
  }
  const dayName = clean(body?.dayName, 80) || "Workout";
  const ai = await aiProvider();
  if (!ai.token) {
    return json({ error: "The server has no AI key. Set AI_GATEWAY_API_KEY in Vercel." }, 500);
  }
  const denied = await AiAuth_check(request);
  if (denied != null) {
    return denied;
  }
  try {
    const {
      status,
      body: answer,
      text: raw,
    } = await fetchJson(
      ai.url,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${ai.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ai.model,
          max_tokens: 300,
          temperature: 0.4,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Session: ${dayName}\nFacts:\n${facts.map((f) => `- ${f}`).join("\n")}` },
          ],
        }),
      },
      30000
    );
    if (status !== 200) {
      const message = answer?.error?.message ?? raw.slice(0, 200);
      return json({ error: `${ai.name} returned ${status}: ${message}` }, 502);
    }
    const content = answer?.choices?.[0]?.message?.content;
    return json({ text: typeof content === "string" ? content.trim().slice(0, 800) : "" });
  } catch {
    return json({ error: "The AI did not answer in 30 seconds" }, 504);
  }
}
