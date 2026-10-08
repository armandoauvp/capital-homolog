import { defineConfig } from 'vite'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), 'src')
const partialsDir = resolve(root, '_partials')

// Cada pasta de src/ com index.html vira uma página (/slug/). Pastas com "_" são internas.
function pageEntries() {
  const entries = { home: resolve(root, 'index.html') }
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

export default defineConfig({
  root,
  publicDir: resolve(root, '..', 'public'),
  appType: 'mpa',
  plugins: [htmlPartials()],
  build: {
    outDir: resolve(root, '..', 'dist'),
    emptyOutDir: true,
    rollupOptions: { input: pageEntries() },
  },
})
