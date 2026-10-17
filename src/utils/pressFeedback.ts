// beBEARlifts fork: iOS-style dimming while a finger is on a tappable element.
// React Native Web renders Pressable as a div with tabindex and cursor: pointer, and no role, so CSS alone
// cannot find it. Cursor is inherited, so the tabindex check is what picks the Pressable over its children.

export const PRESSED_ATTRIBUTE = "data-pressed";

export interface IPressFeedbackNode {
  tagName: string;
  parentElement: IPressFeedbackNode | null;
  hasAttribute(name: string): boolean;
}

const TEXT_ENTRY_TAGS = ["INPUT", "TEXTAREA", "SELECT"];

export function PressFeedback_findTarget<T extends IPressFeedbackNode>(
  start: T | null,
  cursorOf: (node: T) => string
): T | undefined {
  let node: T | null = start;
  while (node != null && node.tagName !== "BODY") {
    if (TEXT_ENTRY_TAGS.includes(node.tagName)) {
      return undefined;
    }
    if (node.hasAttribute("tabindex") && cursorOf(node) === "pointer") {
      return node;
    }
    node = node.parentElement as T | null;
  }
  return undefined;
}

export function PressFeedback_install(doc: Document, win: Window): void {
  let pressed: Element | undefined;
  const release = (): void => {
    pressed?.removeAttribute(PRESSED_ATTRIBUTE);
    pressed = undefined;
  };
  doc.addEventListener(
    "pointerdown",
    (event) => {
      release();
      const target = event.target instanceof Element ? event.target : null;
      pressed = PressFeedback_findTarget(target, (node) => win.getComputedStyle(node).cursor);
      pressed?.setAttribute(PRESSED_ATTRIBUTE, "");
    },
    { passive: true }
  );
  for (const type of ["pointerup", "pointercancel", "scroll"]) {
    doc.addEventListener(type, release, { passive: true, capture: true });
  }
}
