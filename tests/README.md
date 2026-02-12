# Test Organization

Use subfolders by feature/domain (for example, `auth`, `users`, `orders`).

Conventions:
- File name: `*.spec.ts`
- Import `test` and `expect` from `fixtures/test`
- Page Objects live in `pages/`
- Test data lives in `data/` and is loaded via `helpers/test-data`

## Auth

O login utiliza Microsoft SSO. Para evitar MFA em todos os testes, gere um storage state local:

```bash
npm run auth:setup
```

Isso cria `storage/auth.json` e o Playwright passa a reutilizar essa sessao automaticamente.

Por padrao, a automacao ignora o fluxo de MFA. Se quiser tentar SSO automatico, use `ALLOW_MICROSOFT_SSO=1`.

## Fluxos dedicados (por tipo de post)

Para rodar apenas um tipo de post, use o filtro `-g`:

```bash
node scripts/playwright.js test tests/communications/creation.spec.ts -g "Post enquete - fluxo inicial"
```

No GitHub Actions, configure o secret `PLAYWRIGHT_STORAGE_STATE_B64` com o `storage/auth.json` em base64 e execute o workflow **Publish Flows (Posts)**. Cada job roda um tipo de post.

O job **publish_all** executa todos os tipos de post em sequencia.
