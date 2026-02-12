import { expect, Locator, Page } from '@playwright/test';
import { findFirstVisible, tryCheckOrClick, tryClick, tryFill } from './ui';

export const editoriaName = 'Einstein - Institucional - Padrão';

export async function clickNext(page: Page) {
  const nextButton = page.getByRole('button', { name: /pr[oó]ximo/i }).first();
  await expect(nextButton).toBeVisible();
  await expect(nextButton).toBeEnabled();
  await nextButton.click();
}

export async function getTitleField(page: Page): Promise<Locator | null> {
  const candidates = [
    page.getByRole('textbox', { name: /t[ií]tulo/i }),
    page.getByLabel(/t[ií]tulo/i),
    page.getByPlaceholder(/t[ií]tulo/i),
    page.locator('input[name*="title" i]'),
  ];

  for (const candidate of candidates) {
    const visible = await findFirstVisible(candidate);
    if (visible) return visible;
  }
  return null;
}

export async function getBodyField(page: Page): Promise<Locator | null> {
  const candidates = [
    page.getByRole('textbox', { name: /texto|mensagem|conte[uú]do|corpo|body/i }),
    page.getByLabel(/mensagem|conte[uú]do|corpo|body/i),
    page.getByPlaceholder(/texto|mensagem|conte[uú]do|corpo|body/i),
    page.locator('textarea'),
  ];

  for (const candidate of candidates) {
    const visible = await findFirstVisible(candidate);
    if (visible) return visible;
  }
  return null;
}

export async function fillTitleAndBody(page: Page, name: string) {
  const titleValue = `E2E ${name} ${Date.now()}`;
  const bodyValue = 'Mensagem automatizada de teste E2E.';

  await tryFill(page, [
    page.getByRole('textbox', { name: /t[ií]tulo/i }),
    page.getByLabel(/t[ií]tulo/i),
    page.getByPlaceholder(/t[ií]tulo/i),
    page.locator('input[name*="title" i]'),
  ], titleValue);

  await tryFill(page, [
    page.getByRole('textbox', { name: /texto|mensagem|conte[uú]do|corpo|body/i }),
    page.getByLabel(/mensagem|conte[uú]do|corpo|body/i),
    page.getByPlaceholder(/texto|mensagem|conte[uú]do|corpo|body/i),
    page.locator('textarea'),
  ], bodyValue);
}

export async function fillTitleAndBodyWithText(page: Page, text: string) {
  await tryFill(page, [
    page.getByRole('textbox', { name: /t[ií]tulo/i }),
    page.getByLabel(/t[ií]tulo/i),
    page.getByPlaceholder(/t[ií]tulo/i),
    page.locator('input[name*="title" i]'),
  ], text);

  await tryFill(page, [
    page.getByRole('textbox', { name: /texto|mensagem|conte[uú]do|corpo|body/i }),
    page.getByLabel(/mensagem|conte[uú]do|corpo|body/i),
    page.getByPlaceholder(/texto|mensagem|conte[uú]do|corpo|body/i),
    page.locator('textarea'),
  ], text);
}

export async function openAlternativesAndFill(page: Page, text: string) {
  await tryClick(page, [
    page.getByRole('button', { name: /alternativas/i }),
    page.getByText(/alternativas/i),
  ]);

  let filled = await tryFill(page, [
    page.getByLabel(/op[cç][aã]o|alternativa/i),
    page.getByPlaceholder(/op[cç][aã]o|alternativa/i),
    page.locator('input[name*="option" i]'),
  ], text);

  if (!filled) {
    await tryClick(page, [
      page.getByRole('button', { name: /adicionar|nova op[cç][aã]o/i }),
      page.locator('button:has-text("Adicionar")'),
    ]);
    filled = await tryFill(page, [
      page.getByLabel(/op[cç][aã]o|alternativa/i),
      page.getByPlaceholder(/op[cç][aã]o|alternativa/i),
      page.locator('input[name*="option" i]'),
    ], text);
  }

  if (!filled) {
    const textboxes = page.getByRole('textbox');
    const count = await textboxes.count();
    for (let i = 0; i < count; i += 1) {
      const candidate = textboxes.nth(i);
      try {
        const value = await candidate.inputValue();
        if (!value) {
          await candidate.fill(text);
          break;
        }
      } catch {
        // ignore
      }
    }
  }
}

export async function uploadMediaFile(page: Page, filePath: string) {
  const fileInput = page.locator('input[type="file"]');
  if (await fileInput.count()) {
    await fileInput.first().setInputFiles(filePath);
    return true;
  }

  const fileButton = page.getByRole('button', { name: /selecionar arquivo|choose file/i }).first();
  if (await fileButton.count()) {
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      fileButton.click(),
    ]);
    await chooser.setFiles(filePath);
    return true;
  }

  return false;
}

export async function dismissCropDialogIfPresent(page: Page, timeoutMs = 5000) {
  const cropHeading = page.getByText(/ajuste de imagem/i).first();
  if (await cropHeading.isVisible({ timeout: timeoutMs }).catch(() => false)) {
    const continueButton = page.getByRole('button', { name: /continuar/i }).first();
    if (await continueButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await continueButton.click({ force: true });
      await cropHeading.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
      return true;
    }
  }

  const dialogSelector = 'dialog, [role="dialog"], .MuiDialog-root, .MuiModal-root, .ReactModal__Content';
  const dialog = page.locator(dialogSelector);

  const waitForDialogVisible = async () => {
    try {
      await page.waitForSelector(dialogSelector, { state: 'visible', timeout: timeoutMs });
      return true;
    } catch {
      return false;
    }
  };

  const waitForDialogGone = async (target?: Locator) => {
    if (target) {
      await target.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      await target.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
      return;
    }
    await dialog.first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await dialog.first().waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  };

  const tryClickAndWait = async (button: Locator, target?: Locator) => {
    await button.click({ force: true });
    await waitForDialogGone(target);
    return true;
  };

  const globalContinue = page.getByRole('button', { name: /continuar/i }).first();
  if (await globalContinue.isVisible({ timeout: Math.min(timeoutMs, 3000) }).catch(() => false)) {
    await tryClickAndWait(globalContinue);
    return true;
  }

  const cropDialog = dialog.filter({ hasText: /ajuste de imagem|recorte|crop/i });
  const cropVisible = await cropDialog.first().waitFor({ state: 'visible', timeout: timeoutMs }).then(() => true).catch(() => false);

  if (!cropVisible) {
    const hasDialog = await waitForDialogVisible();
    if (!hasDialog) {
      return false;
    }
  }

  const dialogWithTitle = await findFirstVisible(cropDialog);
  const activeDialog = dialogWithTitle ?? (await findFirstVisible(dialog));
  if (!activeDialog) {
    return false;
  }

  const continueButton = activeDialog.getByRole('button', { name: /continuar/i });
  if (await continueButton.count()) {
    await tryClickAndWait(continueButton.first(), activeDialog);
    return true;
  }

  const confirmButton = activeDialog.getByRole('button', {
    name: /salvar|aplicar|confirmar|concluir|ok|confirmar recorte|recortar|cortar/i,
  });
  if (await confirmButton.count()) {
    await tryClickAndWait(confirmButton.first(), activeDialog);
    return true;
  }

  const closeButton = activeDialog.getByRole('button', { name: /fechar|cancelar|x/i });
  if (await closeButton.count()) {
    await tryClickAndWait(closeButton.first(), activeDialog);
    return true;
  }

  const ariaButton = activeDialog.locator(
    '[aria-label*="aplicar" i], [aria-label*="confirm" i], [aria-label*="salvar" i], [title*="aplicar" i], [title*="confirm" i]'
  );
  if (await ariaButton.count()) {
    await tryClickAndWait(ariaButton.first(), activeDialog);
    return true;
  }

  const anyNativeButton = activeDialog.locator('button');
  const anyNativeCount = await anyNativeButton.count();
  if (anyNativeCount) {
    await tryClickAndWait(anyNativeButton.nth(anyNativeCount - 1), activeDialog);
    return true;
  }

  const anyButton = activeDialog.getByRole('button');
  const buttonCount = await anyButton.count();
  if (buttonCount) {
    await tryClickAndWait(anyButton.nth(buttonCount - 1), activeDialog);
    return true;
  }

  await page.keyboard.press('Enter').catch(() => {});
  if (await activeDialog.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape').catch(() => {});
  }

  await waitForDialogGone(activeDialog);
  return true;
}

export async function selectChannels(page: Page, dataCollection: boolean) {
  const appSelected = await tryCheckOrClick(page, [
    page.getByRole('checkbox', { name: /aplicativo/i }),
    page.getByLabel(/aplicativo/i),
    page.getByText(/aplicativo/i),
  ]);

  if (!dataCollection) {
    await tryCheckOrClick(page, [
      page.getByRole('checkbox', { name: /\btv\b/i }),
      page.getByLabel(/\btv\b/i),
      page.getByText(/\btv\b/i),
    ]);
  }

  return appSelected;
}

export async function selectEditoria(page: Page) {
  const waitForNextEnabled = async () => {
    const nextButton = page.getByRole('button', { name: /pr[oó]ximo/i }).first();
    await expect(nextButton).toBeEnabled({ timeout: 10000 });
  };

  const comboSelected = await tryClick(page, [
    page.getByRole('combobox', { name: /editoria/i }),
    page.getByLabel(/editoria/i),
    page.getByText(/editoria/i),
  ]);

  if (comboSelected) {
    await tryClick(page, [
      page.getByRole('option', { name: new RegExp(editoriaName, 'i') }),
      page.getByText(editoriaName),
    ]);
    await waitForNextEnabled();
    return true;
  }

  const editoriaCard = page.getByText(editoriaName).first();
  if (await editoriaCard.count()) {
    await editoriaCard.scrollIntoViewIfNeeded();
    await editoriaCard.click();
    await waitForNextEnabled();
    return true;
  }

  const fallbackSelected = await tryClick(page, [
    page.getByRole('option', { name: new RegExp(editoriaName, 'i') }),
  ]);
  if (fallbackSelected) {
    await waitForNextEnabled();
    return true;
  }

  return false;
}

export async function expectSegmentationStep(page: Page) {
  const heading = page.getByRole('heading', { name: /segmenta[cç][aã]o/i });
  if (await heading.count()) {
    await expect(heading.first()).toBeVisible();
    return;
  }

  const locator = page.locator('main').getByText(/segmenta[cç][aã]o/i).first();
  await expect(locator).toBeVisible();
}

export async function isChannelStepVisible(page: Page) {
  const heading = page.getByRole('heading', { name: /canais/i });
  if (await heading.count()) return true;

  const helperText = page.getByText(/em quais canais/i);
  if (await helperText.count()) return true;

  return false;
}

export async function isEditoriasStepVisible(page: Page) {
  const heading = page.getByRole('heading', { name: /editorias/i });
  if (await heading.count()) return true;

  const helper = page.getByText(/selecione em qual editoria/i);
  if (await helper.count()) return true;

  const editoriaCard = page.getByText(editoriaName);
  return (await editoriaCard.count()) > 0;
}

export async function isContentStepVisible(page: Page) {
  const title = await getTitleField(page);
  if (title) return true;
  const body = await getBodyField(page);
  if (body) return true;
  const question = await findFirstVisible(page.getByLabel(/pergunta|question/i));
  if (question) return true;
  const fileButton = await findFirstVisible(page.getByRole('button', { name: /selecionar arquivo|choose file/i }));
  if (fileButton) return true;

  const coverTab = await findFirstVisible(page.getByRole('tab', { name: /capa/i }));
  if (coverTab) return true;
  const coverHeading = await findFirstVisible(page.getByRole('heading', { name: /capa/i }));
  if (coverHeading) return true;
  const surveyIntro = await findFirstVisible(page.getByText(/comece a criar sua pesquisa/i));
  return !!surveyIntro;
}

export async function isSegmentationStepVisible(page: Page) {
  const heading = page.getByRole('heading', { name: /segmenta[cç][aã]o/i });
  if (await heading.count()) return true;
  return false;
}

export async function disablePartialResultsIfPresent(page: Page) {
  const toggle = page.getByRole('switch', { name: /resultados parciais/i });
  if (await toggle.count()) {
    const state = await toggle.first().getAttribute('aria-checked');
    if (state === 'true') {
      await toggle.first().click();
    }
    return true;
  }

  const checkbox = page.getByRole('checkbox', { name: /resultados parciais/i });
  if (await checkbox.count()) {
    const checked = await checkbox.first().isChecked();
    if (checked) {
      await checkbox.first().click();
    }
    return true;
  }

  const label = page.getByText(/resultados parciais/i);
  if (await label.count()) {
    await label.first().click();
    return true;
  }

  return false;
}

export async function enableOptionByLabel(page: Page, label: RegExp) {
  const toggle = page.getByRole('switch', { name: label });
  if (await toggle.count()) {
    const visible = await toggle.first().isVisible({ timeout: 1000 }).catch(() => false);
    if (visible) {
      const state = await toggle.first().getAttribute('aria-checked');
      if (state !== 'true') {
        await toggle.first().click();
      }
      return true;
    }
  }

  const checkbox = page.getByRole('checkbox', { name: label });
  if (await checkbox.count()) {
    const checked = await checkbox.first().isChecked();
    if (!checked) {
      await checkbox.first().click();
    }
    return true;
  }

  const labelText = page.getByText(label);
  if (await labelText.count()) {
    await labelText.first().click();
    return true;
  }

  return false;
}

export async function selectDisplayDuration(page: Page, optionText: string) {
  const optionLabel = new RegExp(optionText, 'i');
  const combo = page.getByRole('combobox', { name: /prazo de exibi[cç][aã]o/i });
  if (await combo.count()) {
    await combo.first().click();
    await tryClick(page, [
      page.getByRole('option', { name: optionLabel }),
      page.getByText(optionLabel),
    ]);
    return true;
  }

  const select = page.getByLabel(/prazo de exibi[cç][aã]o/i);
  if (await select.count()) {
    await select.first().selectOption({ label: optionText });
    return true;
  }

  const radio = page.getByRole('radio', { name: optionLabel });
  if (await radio.count()) {
    await radio.first().click();
    return true;
  }

  const button = page.getByRole('button', { name: /sempre|prazo de exibi[cç][aã]o/i }).first();
  if (await button.count()) {
    await button.click();
    const clicked = await tryClick(page, [
      page.getByRole('menuitem', { name: optionLabel }),
      page.getByRole('option', { name: optionLabel }),
      page.getByText(optionLabel),
    ]);
    if (clicked) {
      await page.keyboard.press('Escape').catch(() => {});
      await page.mouse.click(5, 5).catch(() => {});
    }
    return true;
  }

  return false;
}

export async function selectDefaultSegmentation(page: Page) {
  const selected = await tryCheckOrClick(page, [
    page.getByRole('checkbox', { name: /todos|toda empresa|todos os colaboradores/i }),
    page.getByRole('treeitem', { name: /todos|toda empresa|todos os colaboradores/i }),
    page.getByText(/^todos$/i),
    page.getByText(/todos os colaboradores|toda empresa|toda a empresa/i),
  ]);

  if (selected) {
    return true;
  }

  const fallbackCheckbox = page.locator('main').getByRole('checkbox').first();
  if (await fallbackCheckbox.count()) {
    await fallbackCheckbox.click();
    return true;
  }

  return false;
}

export async function advanceToContentStep(page: Page, dataCollection: boolean, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isContentStepVisible(page)) {
      return true;
    }

    if (await isChannelStepVisible(page)) {
      await selectChannels(page, dataCollection);
      await clickNext(page);
      continue;
    }

    if (await isEditoriasStepVisible(page)) {
      await selectEditoria(page);
      await clickNext(page);
      continue;
    }

    if (await isSegmentationStepVisible(page)) {
      await selectDefaultSegmentation(page);
      await clickNext(page);
      continue;
    }

    await page.waitForTimeout(500);
  }

  return false;
}
