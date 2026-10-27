export interface INavStateLike {
  index?: number;
  routes: readonly INavRouteLike[];
}

// React Navigation's partial states, from links and restored state, carry routes without a key yet.
export interface INavRouteLike {
  key?: string;
  name: string;
  state?: INavStateLike;
}

function focused(state: INavStateLike): INavRouteLike | undefined {
  return state.routes[state.index ?? state.routes.length - 1];
}

// A sheet or a transparent modal on the root stack leaves the screen under it in sight. The screen is shown when it
// is the focused route under the topmost full-screen root route, whatever sheets sit above that.
export function ScreenUnderSheets_isShown(
  root: INavStateLike | undefined,
  routeKey: string,
  fullScreenRoots: readonly string[]
): boolean {
  if (root == null) {
    return false;
  }
  const below = root.routes.slice(0, (root.index ?? root.routes.length - 1) + 1);
  let route = [...below].reverse().find((r) => fullScreenRoots.includes(r.name));
  while (route != null) {
    if (route.key === routeKey) {
      return true;
    }
    route = route.state == null ? undefined : focused(route.state);
  }
  return false;
}
