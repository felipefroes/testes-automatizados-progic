import { Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async go() {
    await this.page.goto('/manager/login');
  }

  async fillEmail(email: string) {
    const emailField = this.page.getByLabel('E-mail');
    await emailField.fill('');
    await emailField.type(email, { delay: 20 });
  }

  async fillPassword(password: string) {
    const passwordField = this.page.getByLabel('Senha');
    await passwordField.fill('');
    await passwordField.type(password, { delay: 20 });
    await passwordField.press('Tab');
  }

  async submit() {
    const submitButton = this.page.locator('button[type="submit"]');
    if (await submitButton.count()) {
      await submitButton.first().click();
      return;
    }
    const enterButton = this.page.getByRole('button', { name: /^entrar$/i });
    if (await enterButton.count()) {
      await enterButton.first().click();
      return;
    }
    await this.page.keyboard.press('Enter');
  }

  async clickMicrosoft() {
    const microsoftButton = this.page.getByRole('button', { name: /entrar com microsoft/i });
    await microsoftButton.first().click();
  }
}
