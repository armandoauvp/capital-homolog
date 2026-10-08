# AUVP Capital — site estático (Vite)

Reconstrução das páginas de auvpcapital.com.br (antes em WordPress/Elementor) em Vite multi-página, HTML/CSS/JS puro.

## Rodar

```bash
npm install
npm run dev      # servidor local (o atalho do app usa a porta 5174); índice de todas as páginas em /paginas/
npm run build    # gera dist/ (páginas, 404.html e sitemap.xml)
npm run preview  # serve o dist/
```

## Páginas

| Caminho | Fonte |
|---|---|
| `/` | `src/index.html` (+ `src/_home/`) |
| `/wealth/` | `src/wealth/` |
| `/planos/` | `src/planos/` |
| `/cambio/` | `src/cambio/` |
| `/cambio-cloned-2040/` | `src/cambio-cloned-2040/` |
| `/credito/` | `src/credito/` |
| `/corporate/` | `src/corporate/` |
| `/seguros/` | `src/seguros/` |
| `/compliance/` | `src/compliance/` |
| `/abertura-conta-pf/` | `src/abertura-conta-pf/` |
| `/abertura-conta-pj/` | `src/abertura-conta-pj/` |
| `/aupo11-faq/` | `src/aupo11-faq/` |
| `/giro-da-bolsa-itinerante/` | `src/giro-da-bolsa-itinerante/` |
| `/jantar-com-raul/` | `src/jantar-com-raul/` |
| `/auvp-escola-nosso-processo/` | `src/auvp-escola-nosso-processo/` |
| `/link-auvp-business-day/` | `src/link-auvp-business-day/` |
| `/politica-de-privacidade/` | `src/politica-de-privacidade/` (+ `src/_legal/`) |
| `/termos-de-uso/` | `src/termos-de-uso/` (+ `src/_legal/`) |
| `/elementor-4141/` | `src/elementor-4141/` → redireciona para `/seguros/` (301 em `vercel.json`) |
| `/paginas/` | `src/paginas/` — índice navegável de todas as páginas, com busca (noindex). Miniaturas em `public/paginas/miniaturas/`, geradas por `scripts/gerar-miniaturas-paginas.mjs` a partir dos prints em `_migracao/` |

## Estrutura

- `src/<slug>/index.html` vira `/<slug>/`. Pastas que começam com `_` não viram página.
- `src/_partials/` — trechos incluídos com `<!-- @include nome -->` (plugin em `vite.config.js`): `head`, `head-min`, `header`, `header-seguros`, `nav` (menu único dos dois cabeçalhos), `footer`, `footer-seguros`, `footer-links` (colunas de links dos dois rodapés), `schema-org` (JSON-LD da empresa e do site), `calculadora-cambio`. Partials podem incluir outros.
- `public/_shared/base.css` — design system: tokens, cabeçalho, rodapé, botões, FAQ, slideshow, faixa de logos. Fica em `public/` de propósito: assim o Vite não o junta num pacote compartilhado e ele carrega sempre antes do CSS da página, no dev e no build.

- `main.js` (em `src/_shared/`) — GTM `GTM-MRXLB32L` e Clarity `sklzt5vymm` (só no build de produção), repasse de UTMs/ref_nome/product_id/user_id para links de formulário (`form.auvp.com.br/to/nrLyZhc6`, `#checkout`, `#tflink`, `[data-utm]`) e menu mobile.
- `public/wp-content/uploads/` — imagens e PDFs do WordPress, nos mesmos caminhos de antes.
- `_migracao/` (fora do git) — material do crawl usado na reconstrução: textos, códigos, prints e guia.

## SEO e buscas por IA

- `public/robots.txt`: busca tradicional, busca por IA e treino de modelos liberados; aponta para o sitemap.
- `sitemap.xml`: gerado no build por um plugin do `vite.config.js`. Entram só as páginas sem `noindex` e sem canonical para outra URL; `lastmod` = data do último commit da página.
- `public/llms.txt`: resumo da empresa, produtos e links para assistentes de IA. Atualize quando produtos ou taxas mudarem.
- `src/404.html`: página de erro (a Vercel a serve sozinha).
- Cada página tem title, description, canonical, Open Graph e JSON-LD próprios, que referenciam `#organization`/`#website` de `schema-org.html`.
- `scripts/otimizar-imagem.mjs <arquivo-ou-url> <larguras> [qualidade] [pasta]`: gera versões WebP ao lado da original.

## Dependências externas mantidas

Webhooks n8n (câmbio e conta PJ), BrasilAPI (CNPJ), bundle de abertura PF em `cdn.asupernova.com.br`, Google Apps Script (Giro), Typeform `form.auvp.com.br`, YouTube, e bibliotecas por CDN (Tailwind, Lucide, D3, TopoJSON) nas páginas que já usavam.

## Pendências

- Os 4 MP4 de `/aupo11-faq/` (566–716 MB cada) continuam apontando para `auvpcapital.com.br/wp-content/...`, no objeto `VIDEOS` de `src/aupo11-faq/script.js`. Migrar para hospedagem de vídeo antes de desligar o WordPress.
- Testar ponta a ponta, com dados reais, os envios do formulário PJ, do simulador de câmbio e do formulário do Giro (não foram disparados na migração).
- A imagem do hero das páginas legais (`ferramentas.auvp_…png`) tem 6,4 MB; vale converter para webp/avif.
- Conteúdo a revisar: `/auvp-escola-nosso-processo/` é rascunho com placeholders; `/jantar-com-raul/` fala em "mês de junho"; a meta description do Giro é o texto do Jantar (como no WordPress).
