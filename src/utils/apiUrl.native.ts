import { ProgramsHost_fork } from "./programsHost";

export function ApiUrl_for(path: string): string {
  return `${ProgramsHost_fork}${path}`;
}
