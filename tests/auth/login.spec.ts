import { test } from '../../fixtures/test';
import { loginAsValidUser } from '../../helpers/auth';

test('deve logar com sucesso', async ({ page, users }) => {
  await loginAsValidUser(page, users);
});
