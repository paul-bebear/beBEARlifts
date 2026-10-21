export function Invite_parseHandle(value: unknown): string | undefined {
  return typeof value === "string" && /^[a-z0-9_]{3,20}$/.test(value) ? value : undefined;
}

export function Invite_fromUrl(url: string): string | undefined {
  try {
    const values = new URL(url).searchParams.getAll("invite");
    return values.length === 1 ? Invite_parseHandle(values[0]) : undefined;
  } catch {
    return undefined;
  }
}

export function Invite_defaultHandle(userId: string): string {
  return `lifter_${userId
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 13)}`;
}

export function Invite_surface(input: {
  offline: boolean;
  standalone: boolean;
  handle?: string;
  historyCount: number;
  programCount: number;
}): "guide" | "chat" | "app" {
  if (!input.offline) {
    return "app";
  }
  if (input.handle != null && !input.standalone) {
    return "guide";
  }
  return input.historyCount === 0 && input.programCount === 0 ? "chat" : "app";
}
