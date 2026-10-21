export function AppBrand_text(text: string): string {
  return text
    .split(/(https?:\/\/[^\s<>"'`]+|```[\s\S]*?```|`[^`]*`)/g)
    .map((part) => (/^https?:\/\/|^`/.test(part) ? part : part.replace(/\bLiftosaur\b|\bbeBEARlifts\b/g, "beBEAR")))
    .join("");
}
