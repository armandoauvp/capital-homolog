// Gera as miniaturas da página agregadora (/paginas/) a partir dos prints do site original
// em _migracao/paginas/<slug>/prints/ (material da migração, fora do git).
// Usa o print real do Chrome quando existe e, senão, a reconstituição offline.
// Recorta o topo da página em 16:10 e grava 640×400 WebP em public/paginas/miniaturas/<slug>.webp.
// Uso: node scripts/gerar-miniaturas-paginas.mjs
import sharp from 'sharp'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const origem = join(raiz, '_migracao/paginas')
const destino = join(raiz, 'public/paginas/miniaturas')
const LARGURA = 640
const ALTURA = 400

if (!existsSync(origem)) {
  console.error('Pasta _migracao/paginas não encontrada: as miniaturas dependem do material da migração.')
  process.exit(1)
}
mkdirSync(destino, { recursive: true })

for (const slug of readdirSync(origem)) {
  if (slug === 'elementor-4141') continue // só redireciona para /seguros/
  const prints = join(origem, slug, 'prints')
  const arquivo = ['pagina-inteira.jpg', 'reconstituicao-offline-1920px.jpg'].map((f) => join(prints, f)).find(existsSync)
  if (!arquivo) {
    console.warn(`sem print: ${slug}`)
    continue
  }
  const { width } = await sharp(arquivo).metadata()
  const altura = Math.round((width * ALTURA) / LARGURA)
  await sharp(arquivo)
    .extract({ left: 0, top: 0, width, height: altura })
    .resize(LARGURA, ALTURA)
    .webp({ quality: 74 })
    .toFile(join(destino, `${slug}.webp`))
  console.log(`ok: ${slug}`)
}
