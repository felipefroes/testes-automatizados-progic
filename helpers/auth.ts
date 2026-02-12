import { Locator, Page, expect } from '@playwright/test';
import { LoginPage } from '../pages/pages/LoginPage';
import { UsersData } from './test-data';

const PASSWORD_LOGIN_BLOCKED = /Acesso por senha não autorizado/i;
const MANAGER_URL = /\/manager\/?($|\?)/;

export async function loginAsValidUser(page: Page, users: UsersData) {
  const loginPage = new LoginPage(page);
  await page.goto('/manager');
  if (!page.url().includes('/manager/login')) {
    await expect(page).toHaveURL(MANAGER_URL);
    return;
  }

  const allowSso = process.env.ALLOW_MICROSOFT_SSO === '1';
  if (!allowSso) {
    throw new Error(
      'Login via Microsoft SSO/MFA ignorado para automacao. Gere um storage state com `npm run auth:setup` antes de rodar os testes (ou habilite ALLOW_MICROSOFT_SSO=1).'
    );
  }

  await loginPage.go();

  const microsoftEmail = process.env.MICROSOFT_EMAIL ?? users.validUser.email;
  const microsoftPassword = process.env.MICROSOFT_PASSWORD ?? users.validUser.password;
  const preferMicrosoft = process.env.AUTH_STRATEGY === 'microsoft' || process.env.USE_MICROSOFT_SSO === '1';

  if (!preferMicrosoft && !(await isPasswordLoginBlocked(page))) {
    await loginPage.fillEmail(users.validUser.email);
    await loginPage.fillPassword(users.validUser.password);
    await loginPage.submit();

    if (await waitForManagerUrl(page, 8000)) {
      return;
    }
  }

  await loginWithMicrosoft(page, loginPage, microsoftEmail, microsoftPassword);
  if (page.url().includes('login.microsoftonline.com')) {
    throw new Error(
      'Login Microsoft nao foi concluido (provavel MFA). Gere um storage state com `npm run auth:setup` antes de rodar os testes.'
    );
  }
  await expect(page).toHaveURL(MANAGER_URL, { timeout: 30000 });
}

async function waitForManagerUrl(page: Page, timeout: number) {
  try {
    await expect(page).toHaveURL(MANAGER_URL, { timeout });
    return true;
  } catch {
    return false;
  }
}

async function isPasswordLoginBlocked(page: Page) {
  const banner = page.getByText(PASSWORD_LOGIN_BLOCKED);
  try {
    return await banner.isVisible({ timeout: 1000 });
  } catch {
    return false;
  }
}

async function loginWithMicrosoft(page: Page, loginPage: LoginPage, email: string, password: string) {
  const microsoftButton = page.getByRole('button', { name: /entrar com microsoft/i });
  if (await microsoftButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await loginPage.clickMicrosoft();
  }

  await page.waitForURL(/login\.microsoftonline\.com|login\.live\.com/i, { timeout: 20000 });

  await maybeSelectAccount(page, email);

  await page
    .getByRole('heading', { name: /sign in|entrar/i })
    .first()
    .waitFor({ state: 'visible', timeout: 20000 })
    .catch(() => {});

  await fillMicrosoftEmail(page, email);

  const passwordInput = page.locator('input#i0118, input[type="password"], input[name="passwd"]');
  const usePasswordLink = page.getByRole('link', {
    name: /use your password instead|usar sua senha|usar senha/i,
  });

  const hasPassword = await waitForPasswordOrMfa(page, passwordInput, usePasswordLink);

  if (hasPassword && (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false))) {
    await passwordInput.fill(password);
    await clickFirstVisible(page.getByRole('button', { name: /sign in|entrar|login/i }));

    const mfaAfterPassword = page.getByRole('heading', {
      name: /approve sign in|request wasn.?t sent/i,
    });
    if (await mfaAfterPassword.isVisible({ timeout: 20000 }).catch(() => false)) {
      throw new Error(
        'Login bloqueado por MFA da Microsoft apos a senha. Gere um storage state com `npm run auth:setup` ou aprove a notificacao no Authenticator.'
      );
    }
  } else {
    const mfaHeading = page.getByRole('heading', {
      name: /approve sign in|request wasn.?t sent/i,
    });
    if (await mfaHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      throw new Error(
        'Login bloqueado por MFA da Microsoft. Gere um storage state com `npm run auth:setup` ou aprove a notificacao no Authenticator.'
      );
    }
    throw new Error(
      'Nao foi possivel avancar no login da Microsoft. Gere um storage state com `npm run auth:setup` para continuar.'
    );
  }

  await handleStaySignedIn(page);
}

async function fillMicrosoftEmail(page: Page, email: string) {
  const emailInput = await findFirstVisibleFromList([
    page.locator('#i0116'),
    page.locator('input[name="loginfmt"]'),
    page.locator('input[type="email"]'),
    page.locator('input[placeholder*="example"]'),
    page.getByRole('textbox'),
  ]);

  if (!emailInput) {
    return;
  }

  await emailInput.click().catch(() => {});
  await emailInput.fill('').catch(() => {});
  await emailInput.type(email, { delay: 40 }).catch(() => {});
  await emailInput.evaluate((el, value) => {
    const input = el as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, email).catch(() => {});
  await emailInput.press('Tab').catch(() => {});

  const nextButton = await findFirstVisibleFromList([
    page.locator('#idSIButton9'),
    page.getByRole('button', { name: /next|próximo|avançar|continuar/i }),
    page.locator('input[type="submit"]'),
  ]);

  if (nextButton) {
    await expect(nextButton).toBeEnabled({ timeout: 10000 }).catch(() => {});
    await nextButton.click({ timeout: 10000 }).catch(async () => {
      await emailInput.press('Enter').catch(() => {});
    });
    return;
  }

  await emailInput.press('Enter').catch(() => {});
}

async function maybeSelectAccount(page: Page, email: string) {
  const accountButton = page.getByRole('button', { name: new RegExp(email, 'i') });
  if (await accountButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await accountButton.click();
    return;
  }

  const useAnother = page.getByRole('button', {
    name: /use another account|usar outra conta|outra conta/i,
  });
  if (await useAnother.isVisible({ timeout: 3000 }).catch(() => false)) {
    await useAnother.click();
  }
}

async function handleStaySignedIn(page: Page) {
  const yesButton = page.getByRole('button', { name: /yes|sim/i });
  if (await yesButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await yesButton.click();
    return;
  }

  const noButton = page.getByRole('button', { name: /no|não/i });
  if (await noButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await noButton.click();
  }
}

async function waitForPasswordOrMfa(
  page: Page,
  passwordInput: Locator,
  usePasswordLink: Locator
) {
  const timeoutMs = 20000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await passwordInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      return true;
    }

    if (await usePasswordLink.isVisible({ timeout: 1000 }).catch(() => false)) {
      await usePasswordLink.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
      continue;
    }

    await page.waitForTimeout(1000);
  }
  return false;
}

async function clickFirstVisible(...locators: Locator[]) {
  for (const locator of locators) {
    if (await locator.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await locator.first().click();
      return true;
    }
  }
  return false;
}

async function findFirstVisibleFromList(candidates: Locator[]) {
  for (const candidate of candidates) {
    const count = await candidate.count();
    for (let i = 0; i < count; i += 1) {
      const item = candidate.nth(i);
      try {
        if (await item.isVisible()) {
          return item;
        }
      } catch {
        // Ignore hidden/detached items.
      }
    }
  }
  return null;
}
