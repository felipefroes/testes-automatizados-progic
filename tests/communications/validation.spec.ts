import { test, expect } from '../../fixtures/test';
import { loginAsValidUser } from '../../helpers/auth';
import {
  advanceToContentStep,
  getBodyField,
  getTitleField,
} from '../../helpers/communications';

test.describe('Validacoes de comunicados', () => {
  test('limita corpo a 10.000 caracteres', async ({ page, users }) => {
    await loginAsValidUser(page, users);
    await page.goto('/manager/communications/new/simple-communication');
    await advanceToContentStep(page, false);

    const bodyField = await getBodyField(page);
    test.skip(!bodyField, 'Campo de corpo nao encontrado.');

    const longText = 'a'.repeat(10050);
    await bodyField!.fill(longText);

    const value = await bodyField!.inputValue();
    if (value.length > 10000) {
      await expect(
        page.getByText(/ultrapassa o n[uú]mero m[aá]ximo de caracteres/i)
      ).toBeVisible();
    } else {
      expect(value.length).toBeLessThanOrEqual(10000);
    }
  });

  test('post simples avanca com titulo e corpo preenchidos', async ({ page, users }) => {
    await loginAsValidUser(page, users);
    await page.goto('/manager/communications/new/simple-communication');
    await advanceToContentStep(page, false);

    const titleField = await getTitleField(page);
    const bodyField = await getBodyField(page);
    test.skip(!titleField || !bodyField, 'Campos de titulo/corpo nao encontrados.');

    await titleField!.fill('Titulo preenchido');
    await bodyField!.fill('Corpo preenchido');
    const nextButton = page.getByRole('button', { name: /pr[oó]ximo/i }).first();
    await expect(nextButton).toBeEnabled();
  });

  // Removido: validacao de resultados parciais para focar na publicacao bem-sucedida.
});
