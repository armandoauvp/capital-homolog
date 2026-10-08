import { defineConfig } from 'vite'
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs'
import { resolve, dirname, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), 'src')
const partialsDir = resolve(root, '_partials')
const outDir = resolve(root, '..', 'dist')
const SITE = 'https://auvpcapital.com.br'

// Cada pasta de src/ com index.html vira uma página (/slug/). Pastas com "_" são internas.
// src/404.html é a página de erro (a Vercel a serve sozinha para URLs inexistentes).
function pageEntries() {
  const entries = { home: resolve(root, 'index.html'), '404': resolve(root, '404.html') }
  for (const dir of readdirSync(root, { withFileTypes: true })) {
    if (!dir.isDirectory() || dir.name.startsWith('_')) continue
    const file = resolve(root, dir.name, 'index.html')
    if (existsSync(file)) entries[dir.name] = file
  }
  return entries
}

// Substitui <!-- @include nome --> pelo conteúdo de src/_partials/nome.html (partials podem incluir outros).
function htmlPartials() {
  const re = /<!--\s*@include\s+([\w-]+)\s*-->/g
  const expand = (html, depth = 0) => {
    if (depth > 5) throw new Error('Inclusão de partials aninhada demais (ciclo?)')
    return html.replace(re, (_, name) => expand(readFileSync(resolve(partialsDir, `${name}.html`), 'utf8'), depth + 1))
  }
  return {
    name: 'html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => expand(html),
    },
    handleHotUpdate({ file, server }) {
      if (file.startsWith(partialsDir.replace(/\\/g, '/')) || file.startsWith(partialsDir)) {
        server.ws.send({ type: 'full-reload' })
        return []
      }
    },
  }
}

// Data do último commit que mexeu no arquivo (lastmod do sitemap); sem git disponível, fica sem data.
function lastCommitDate(file) {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { encoding: 'utf8' }).trim() || null
  } catch {
    return null
  }
}

// Gera dist/sitemap.xml com as páginas publicadas que não têm noindex nem canonical para outra URL.
function sitemap() {
  let out = outDir
  return {
    name: 'sitemap',
    apply: 'build',
    // Respeita um --outDir passado na linha de comando.
    configResolved(config) {
      out = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const urls = []
      const walk = (dir) => {
        for (const item of readdirSync(dir, { withFileTypes: true })) {
          const full = resolve(dir, item.name)
          if (item.isDirectory()) walk(full)
          else if (item.name === 'index.html') {
            const html = readFileSync(full, 'utf8')
            if (/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)) continue
            const slug = relative(out, dirname(full)).split(sep).join('/')
            const loc = `${SITE}/${slug ? slug + '/' : ''}`
            // Página com canonical para outra URL (ex.: variação) não entra no sitemap.
            const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1]
            if (canonical && canonical !== loc) continue
            const source = slug ? resolve(root, slug, 'index.html') : resolve(root, 'index.html')
            urls.push({ loc, lastmod: lastCommitDate(source) })
          }
        }
      }
      walk(out)
      urls.sort((a, b) => a.loc.localeCompare(b.loc))
      const body = urls
        .map(({ loc, lastmod }) => `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`)
        .join('\n')
      writeFileSync(
        resolve(out, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
      )
    },
  }
}

export default defineConfig({
  root,
  publicDir: resolve(root, '..', 'public'),
  appType: 'mpa',
  plugins: [htmlPartials(), sitemap()],
  build: {
    outDir,
    emptyOutDir: true,
    rollupOptions: { input: pageEntries() },
  },
})
