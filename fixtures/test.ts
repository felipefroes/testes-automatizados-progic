import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/pages/LoginPage';
import { getUsers, UsersData } from '../helpers/test-data';

type Fixtures = {
  loginPage: LoginPage;
  users: UsersData;
};

const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  users: async ({}, use) => {
    await use(getUsers());
  },
});

export { test, expect };
