// A native release build sets __HOST__ to upstream's www.liftosaur.com, whose program list lacks the fork's programs.
export const ProgramsHost_fork = "https://lifts.paulbebear.com";

export function ProgramsHost_pick(args: { isWeb: boolean; isDev: boolean; pageHost: string }): string {
  return args.isWeb || args.isDev ? args.pageHost : ProgramsHost_fork;
}
