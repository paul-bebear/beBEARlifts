export const ProgramsHost_fork = "https://lifts.paulbebear.com";

export function ProgramsHost_pick(args: { isWeb: boolean; isDev: boolean; pageHost: string }): string {
  return args.isWeb || args.isDev ? args.pageHost : ProgramsHost_fork;
}
