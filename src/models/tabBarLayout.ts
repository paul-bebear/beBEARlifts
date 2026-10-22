export interface ITabBarLayout {
  pillHeight: number;
  bottomGap: number;
  height: number;
}

const TabBarLayout_pillHeight = 60;

// Phones without a home indicator report a 0 inset, and a pill flush with the screen edge looks docked.
const minBottomGap = 12;
const contentGap = 16;

export function TabBarLayout_compute(bottomInset: number): ITabBarLayout {
  const bottomGap = Math.max(bottomInset, minBottomGap);
  return { pillHeight: TabBarLayout_pillHeight, bottomGap, height: TabBarLayout_pillHeight + bottomGap };
}

export function TabBarLayout_contentPadding(tabBarHeight: number): number {
  return tabBarHeight > 0 ? tabBarHeight + contentGap : 0;
}

export function TabBarLayout_scrollPadding(args: { tabBarHeight: number; footerHeight: number }): number {
  return args.footerHeight + TabBarLayout_contentPadding(args.tabBarHeight);
}

export function TabBarLayout_coveredBottom(args: { tabBarHeight: number; footerHeight: number }): number {
  return args.footerHeight + args.tabBarHeight;
}

// The footer rides up on a keyboard only by the part of it taller than the bar, since the keyboard
// covers the bar first.
export function TabBarLayout_keyboardOccluded(args: {
  coveredBottom: number;
  tabBarHeight: number;
  keypadHeight: number;
  systemKeyboardHeight: number;
}): number {
  const lift = Math.max(0, args.keypadHeight - args.tabBarHeight, args.systemKeyboardHeight - args.tabBarHeight);
  return args.coveredBottom + lift;
}
