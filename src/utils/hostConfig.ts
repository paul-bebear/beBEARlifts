import { Platform } from "react-native";
import { ProgramsHost_fork } from "./programsHost";

function baseHost(): string {
  return (globalThis as { __HOST__?: string }).__HOST__ ?? ProgramsHost_fork;
}

export function HostConfig_resolveUrl(path: string): string {
  if (Platform.OS === "web" || !path.startsWith("/")) {
    return path;
  }
  return `${baseHost()}${path}`;
}
