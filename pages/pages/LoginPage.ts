import { Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async go() {
    await this.page.goto('/login');
  }

  async fillEmail(email: string) {
    await this.page.getByLabel('E-mail').fill(email);
  }

  async fillPassword(password: string) {
    await this.page.getByLabel('Senha').fill(password);
  }

  async submit() {
    await this.page.click('button[type="submit"]');
  }
}
