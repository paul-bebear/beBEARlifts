export function CheckedSet_toggle(ticked: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(ticked);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}
