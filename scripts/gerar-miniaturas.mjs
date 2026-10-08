// Gera miniaturas WebP (800px de largura) das fotos locais do Giro da Bolsa Itinerante.
// Grava ao lado das originais com o sufixo -800.webp (ex.: DSC01389-scaled-800.webp).
// Reexecutável: pula miniaturas já mais novas que a original; use --force para refazer tudo.
// Uso: node scripts/gerar-miniaturas.mjs [--force]
import sharp from 'sharp'
import { readdirSync, statSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pasta = join(raiz, 'public/wp-content/uploads/2026/07')
const LARGURA = 800
const QUALIDADE = 72
const force = process.argv.includes('--force')

// Só as fotos do evento (DSC*.jpg); ignora miniaturas e outros arquivos da pasta
const fotos = readdirSync(pasta).filter((f) => /^DSC.*\.jpe?g$/i.test(f))

let geradas = 0
for (const foto of fotos) {
  const origem = join(pasta, foto)
  const destino = join(pasta, foto.replace(/\.jpe?g$/i, `-${LARGURA}.webp`))
  if (!force && existsSync(destino) && statSync(destino).mtimeMs >= statSync(origem).mtimeMs) continue

  // rotate() sem argumento aplica a orientação EXIF, como o navegador faz na original
  const info = await sharp(origem)
    .rotate()
    .resize({ width: LARGURA, withoutEnlargement: true })
    .webp({ quality: QUALIDADE })
    .toFile(destino)
  geradas++
  console.log(`${foto} -> ${info.width}x${info.height}, ${Math.round(info.size / 1024)} KB`)
}
console.log(`${geradas} miniatura(s) gerada(s), ${fotos.length - geradas} já atualizada(s).`)
