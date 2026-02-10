import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/pages/LoginPage';
import { readFileSync } from 'fs';
import path from 'path';

const usersPath = path.join(process.cwd(), 'data/data/users.json');
const users = JSON.parse(readFileSync(usersPath, 'utf-8')) as {
  validUser: { email: string; password: string };
};

test('deve logar com sucesso', async ({ page }) => {

  const login = new LoginPage(page);

  await login.go();
  await login.fillEmail(users.validUser.email);
  await login.fillPassword(users.validUser.password);
  await login.submit();

  await expect(page).toHaveURL(/\/manager\/?$/);
});
