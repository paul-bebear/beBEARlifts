// Chat apps sometimes copy the code fence along with the block, so strip it before the CSV parser sees it.
export function CsvFromChat_extract(text: string): string | undefined {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```[a-z]*\s*\n([\s\S]*?)\n?```$/i);
  const csv = (fenced != null ? fenced[1] : trimmed).trim();
  return csv === "" ? undefined : csv;
}
