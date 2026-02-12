import { Locator, Page } from '@playwright/test';

export async function findFirstVisible(locator: Locator): Promise<Locator | null> {
  const count = await locator.count();
  for (let i = 0; i < count; i += 1) {
    const candidate = locator.nth(i);
    try {
      if (await candidate.isVisible()) {
        return candidate;
      }
    } catch {
      // Ignore detached/hidden candidates.
    }
  }
  return null;
}

export async function tryFill(page: Page, candidates: Locator[], value: string) {
  for (const candidate of candidates) {
    const visible = await findFirstVisible(candidate);
    if (visible) {
      await visible.fill(value);
      return true;
    }
  }
  return false;
}

export async function tryClick(page: Page, candidates: Locator[]) {
  for (const candidate of candidates) {
    const visible = await findFirstVisible(candidate);
    if (visible) {
      await visible.click();
      return true;
    }
  }
  return false;
}

export async function tryCheckOrClick(page: Page, candidates: Locator[]) {
  for (const candidate of candidates) {
    const visible = await findFirstVisible(candidate);
    if (!visible) continue;
    try {
      await visible.check();
      return true;
    } catch {
      try {
        await visible.click();
        return true;
      } catch {
        // continue
      }
    }
  }
  return false;
}
