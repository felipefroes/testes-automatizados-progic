import path from 'path';
import { test } from '../../fixtures/test';
import { loginAsValidUser } from '../../helpers/auth';
import {
  advanceToContentStep,
  clickNext,
  isChannelStepVisible,
  isContentStepVisible,
  isEditoriasStepVisible,
  isSegmentationStepVisible,
  openAlternativesAndFill,
  enableOptionByLabel,
  selectDisplayDuration,
  uploadMediaFile,
  dismissCropDialogIfPresent,
  selectChannels,
  selectEditoria,
  expectSegmentationStep,
  getTitleField,
  getBodyField,
} from '../../helpers/communications';
import { findFirstVisible } from '../../helpers/ui';

type PostType = {
  name: string;
  path: string;
  dataCollection: boolean;
  requiresOptions?: boolean;
  requiresQuestion?: boolean;
  requiresDeadline?: boolean;
};


const postTypes: PostType[] = [
  {
    name: 'Post carrossel',
    path: '/manager/communications/new/carousel-communication',
    dataCollection: false,
  },
  {
    name: 'Post enquete',
    path: '/manager/communications/new/poll',
    dataCollection: true,
    requiresQuestion: true,
    requiresOptions: true,
    requiresDeadline: true,
  },
  {
    name: 'Pergunta unica',
    path: '/manager/communications/new/simple-survey',
    dataCollection: true,
    requiresQuestion: true,
  },
  {
    name: 'Pesquisa',
    path: '/manager/communications/new/survey',
    dataCollection: true,
    requiresQuestion: true,
  },
  {
    name: 'Quiz',
    path: '/manager/communications/new/quiz',
    dataCollection: true,
    requiresQuestion: true,
    requiresOptions: true,
  },
  {
    name: 'Questionario',
    path: '/manager/communications/new/exam',
    dataCollection: true,
    requiresQuestion: true,
    requiresOptions: true,
  },
];

const standardText = 'Teste automatizado_Froes';

const mediaFiles = {
  image: path.resolve(__dirname, '../../data/media/post-image.png'),
  gif: path.resolve(__dirname, '../../data/media/simple.gif'),
  video: path.resolve(__dirname, '../../data/media/simple.mp4'),
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function safeGoto(page, url: string) {
  const target = url.startsWith('http') ? url : url;
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (page.url().includes('/manager/login')) {
        throw new Error('Sessao expirada ao abrir a tela. Gere um novo auth.json.');
      }
      return;
    } catch (error) {
      lastError = error;
      if (!String(error).includes('ERR_ABORTED')) {
        throw error;
      }
      await page.waitForTimeout(1000);
    }
  }
  throw lastError ?? new Error(`Falha ao navegar para ${target}`);
}

async function fillTitleAndBodyForType(page, typeLabel: string) {
  const timestamp = new Date().toISOString().replace('T', ' ').replace('Z', ' UTC');
  const titleValue = `${standardText} - ${typeLabel} - ${timestamp}`;
  const title = await getTitleField(page);
  if (title) {
    await title.fill(titleValue);
  }

  const body = await getBodyField(page);
  if (body) {
    await body.fill(standardText);
  }

  return titleValue;
}

async function waitForUploadProgressToFinish(page, timeoutMs = 120000) {
  const progressBar = page.getByRole('progressbar').first();
  const visible = await progressBar.isVisible({ timeout: 2000 }).catch(() => false);
  if (!visible) return false;

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const isVisible = await progressBar.isVisible().catch(() => false);
    if (!isVisible) {
      return true;
    }
    const value = await progressBar.getAttribute('aria-valuenow');
    if (value && Number(value) >= 100) {
      await progressBar.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
      return true;
    }
    await page.waitForTimeout(1000);
  }

  throw new Error('Upload de video nao finalizou dentro do tempo esperado.');
}

async function waitForPublicationCard(page, titleValue: string) {
  await page.getByRole('heading', { name: /comunica[cç][oõ]es/i }).first().waitFor({ timeout: 30000 });
  const cardByRole = page.getByRole('button', { name: new RegExp(escapeRegExp(titleValue), 'i') }).first();
  if (await cardByRole.isVisible({ timeout: 10000 }).catch(() => false)) {
    return;
  }
  const cardByText = page.getByText(titleValue).first();
  await cardByText.waitFor({ timeout: 20000 });
}

async function publishSimplePost(page, users, typeLabel: string, media?: string) {
  await loginAsValidUser(page, users);
  await safeGoto(page, '/manager/communications/new/simple-communication');

  const advanced = await advanceToContentStep(page, false);
  if (!advanced) {
    throw new Error('Nao foi possivel avancar ate o conteudo do post simples.');
  }

  const titleValue = await fillTitleAndBodyForType(page, typeLabel);

  if (media) {
    const uploaded = await uploadMediaFile(page, media);
    if (!uploaded) {
      throw new Error('Nao foi possivel anexar midia ao post simples.');
    }
    await dismissCropDialogIfPresent(page, 20000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }

  await clickNextOrStep(page, /tv/i, media ? 15000 : 0);

  const optionsLabel = page.getByText(/destaque com notifica[cç][aã]o/i).first();
  const optionsVisible = await optionsLabel.isVisible().catch(() => false);
  if (!optionsVisible) {
    await clickNextOrStep(page, /aplicativo/i);
  }

  await enableOptionByLabel(page, /destaque com notifica[cç][aã]o/i);
  await enableOptionByLabel(page, /fixar no topo.*app/i);

  await clickNextOrStep(page, /publica[cç][aã]o/i);

  const selected = await selectDisplayDuration(page, '5 dias');
  if (!selected) {
    throw new Error('Prazo de exibicao "5 dias" nao encontrado.');
  }

  const publishButton = page.getByRole('button', { name: /publicar/i }).first();
  await publishButton.click();
  if (media === mediaFiles.video) {
    await waitForUploadProgressToFinish(page);
  }
  await waitForPublicationCard(page, titleValue);
}

async function clickNextOrStep(page, stepLabel: RegExp, cropTimeoutMs = 0) {
  const nextCandidates = page.getByRole('button', { name: /pr[oó]ximo/i });
  const stepCandidates = page.getByRole('button', { name: stepLabel });

  const tryNext = async () => {
    const nextButton = await findFirstVisible(nextCandidates);
    if (!nextButton) return false;
    await nextButton.click();
    return true;
  };

  await dismissCropDialogIfPresent(page, 1500);
  if (await tryNext()) {
    if (cropTimeoutMs > 0) {
      const dismissed = await dismissCropDialogIfPresent(page, cropTimeoutMs);
      if (dismissed) {
        await tryNext();
      }
    }
    return;
  }

  const stepButton = await findFirstVisible(stepCandidates);
  if (stepButton) {
    await stepButton.click();
    return;
  }

  await dismissCropDialogIfPresent(page, 1500);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});

  if (await tryNext()) {
    if (cropTimeoutMs > 0) {
      const dismissed = await dismissCropDialogIfPresent(page, cropTimeoutMs);
      if (dismissed) {
        await tryNext();
      }
    }
    return;
  }

  const stepAfterScroll = await findFirstVisible(stepCandidates);
  if (stepAfterScroll) {
    await stepAfterScroll.click();
    return;
  }

  throw new Error(`Nao foi possivel avancar para a etapa: ${stepLabel}`);
}

test.describe('Postagem simples - publicacao', () => {
  test.setTimeout(120000);

  test('Post simples - sem midia', async ({ page, users }) => {
    await publishSimplePost(page, users, 'Post simples - sem midia');
  });

  test('Post simples - com imagem', async ({ page, users }) => {
    await publishSimplePost(page, users, 'Post simples - com imagem', mediaFiles.image);
  });

  test('Post simples - com GIF', async ({ page, users }) => {
    await publishSimplePost(page, users, 'Post simples - com GIF', mediaFiles.gif);
  });

  test('Post simples - com video', async ({ page, users }) => {
    await publishSimplePost(page, users, 'Post simples - com video', mediaFiles.video);
  });
});

test.describe('Criacao de comunicados', () => {
  for (const type of postTypes) {
    test(`${type.name} - fluxo inicial`, async ({ page, users }) => {
      await loginAsValidUser(page, users);
      await page.goto(type.path);

      if (type.name === 'Post enquete') {
        const advanced = await advanceToContentStep(page, true);
        if (!advanced) {
          throw new Error('Nao foi possivel avancar ate o conteudo da enquete.');
        }

        const titleValue = await fillTitleAndBodyForType(page, 'Post enquete');
        await openAlternativesAndFill(page, standardText);

        await clickNext(page);

        await enableOptionByLabel(page, /mostrar resultados parciais/i);
        await enableOptionByLabel(page, /destaque com notifica[cç][aã]o/i);
        await enableOptionByLabel(page, /fixar no topo.*app/i);

        await clickNext(page);

        await selectDisplayDuration(page, '5 dias');

        const publishButton = page.getByRole('button', { name: /publicar/i }).first();
        await publishButton.click();
        await waitForPublicationCard(page, titleValue);
        return;
      }

      const start = Date.now();
      while (Date.now() - start < 30000) {
        if (await isContentStepVisible(page)) {
          await fillTitleAndBodyForType(page, type.name);
          return;
        }

        if (await isChannelStepVisible(page)) {
          await selectChannels(page, type.dataCollection);
          await clickNext(page);
          continue;
        }

        if (await isEditoriasStepVisible(page)) {
          await selectEditoria(page);
          await clickNext(page);
          continue;
        }

        if (await isSegmentationStepVisible(page)) {
          await expectSegmentationStep(page);
          return;
        }

        await page.waitForTimeout(500);
      }

      throw new Error('Nao foi possivel avancar ate a segmentacao.');
    });
  }
});
