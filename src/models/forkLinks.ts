import { ProgramsHost_fork } from "../utils/programsHost";

export function ForkLinks_isImportLink(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.origin !== ProgramsHost_fork) {
    return false;
  }
  return (parsed.pathname === "/program" && parsed.searchParams.has("data")) || parsed.pathname.startsWith("/p/");
}
