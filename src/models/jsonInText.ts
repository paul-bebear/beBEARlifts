export function JsonInText_extract(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced != null ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) {
    return undefined;
  }
  const whole = parseObject(body.slice(start, end + 1));
  if (whole !== undefined) {
    return whole;
  }
  for (const candidate of balancedObjects(body)) {
    const parsed = parseObject(candidate);
    if (parsed !== undefined) {
      return parsed;
    }
  }
  return undefined;
}

function parseObject(candidate: string): unknown {
  try {
    return JSON.parse(candidate);
  } catch {
    return undefined;
  }
}

// Only top-level objects: a cut-off answer must stay unparsed, so FoodPhotoEstimate_parse can salvage its items.
function balancedObjects(body: string): string[] {
  const found: string[] = [];
  let start = body.indexOf("{");
  while (start !== -1) {
    const end = matchingBrace(body, start);
    if (end === -1) {
      break;
    }
    found.push(body.slice(start, end + 1));
    start = body.indexOf("{", end + 1);
  }
  return found;
}

function matchingBrace(body: string, start: number): number {
  let depth = 0;
  let inString = false;
  for (let i = start; i < body.length; i += 1) {
    const char = body[i];
    if (inString) {
      if (char === "\\") {
        i += 1;
      } else if (char === '"') {
        inString = false;
      }
    } else if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}
