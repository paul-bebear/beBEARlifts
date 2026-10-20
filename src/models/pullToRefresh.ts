// react-native-web renders RefreshControl as a plain view, so the PWA reads the pull from touch events.
export interface IPullState {
  startY?: number;
  distance: number;
}

export const PullToRefresh_threshold = 70;

export function PullToRefresh_idle(): IPullState {
  return { distance: 0 };
}

// A pull counts only when it starts with the list scrolled to the top. Otherwise the finger is scrolling up.
export function PullToRefresh_start(scrollY: number, touchY: number): IPullState {
  return scrollY <= 0 ? { startY: touchY, distance: 0 } : PullToRefresh_idle();
}

export function PullToRefresh_move(state: IPullState, touchY: number): IPullState {
  return state.startY == null ? state : { ...state, distance: Math.max(0, touchY - state.startY) };
}

export function PullToRefresh_isReady(state: IPullState): boolean {
  return state.distance >= PullToRefresh_threshold;
}

export function PullToRefresh_end(state: IPullState): { state: IPullState; refresh: boolean } {
  return { state: PullToRefresh_idle(), refresh: PullToRefresh_isReady(state) };
}
