export interface IFoodSaveGuard {
  current: boolean;
}

// A save that closes the screen keeps the guard set, so a second tap during the close animation cannot log twice.
export async function FoodSaveGuard_run(
  guard: IFoodSaveGuard,
  save: () => Promise<void>,
  closesScreen: boolean
): Promise<boolean> {
  if (guard.current) {
    return false;
  }
  guard.current = true;
  try {
    await save();
    guard.current = closesScreen;
    return true;
  } catch {
    guard.current = false;
    return false;
  }
}
