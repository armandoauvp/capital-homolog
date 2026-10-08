// Gera versões WebP mais leves de uma imagem, ao lado da original, com o sufixo da largura.
// A original não é alterada. Arquivos remotos (http/https) são baixados e gravados no destino informado.
//
// Uso:
//   node scripts/otimizar-imagem.mjs <arquivo-ou-url> <larguras separadas por vírgula> [qualidade=72] [pasta-destino]
// Exemplos:
//   node scripts/otimizar-imagem.mjs public/wp-content/uploads/2025/03/foto.png 1920,960
//     -> public/wp-content/uploads/2025/03/foto-1920.webp e foto-960.webp
//   node scripts/otimizar-imagem.mjs "https://cdn.asupernova.com.br/pasta/DSC03356.jpg" 800,1600 72 public/img/giro
//     -> public/img/giro/DSC03356-800.webp e DSC03356-1600.webp
// Imagens menores que a largura pedida não são ampliadas.
import sharp from 'sharp'
import { mkdirSync, readFileSync } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'

const [entrada, larguras, qualidade = '72', destinoArg] = process.argv.slice(2)
if (!entrada || !larguras) {
  console.error('Uso: node scripts/otimizar-imagem.mjs <arquivo-ou-url> <larguras> [qualidade] [pasta-destino]')
  process.exit(1)
}

const remota = /^https?:\/\//.test(entrada)
const dados = remota ? Buffer.from(await (await fetch(entrada)).arrayBuffer()) : readFileSync(entrada)
const nome = decodeURIComponent(basename(remota ? new URL(entrada).pathname : entrada, extname(remota ? new URL(entrada).pathname : entrada)))
const destino = destinoArg || (remota ? '.' : dirname(entrada))
mkdirSync(destino, { recursive: true })

const { width: original } = await sharp(dados).metadata()
for (const largura of larguras.split(',').map(Number)) {
  const saida = join(destino, `${nome}-${largura}.webp`)
  const info = await sharp(dados)
    .rotate()
    .resize({ width: Math.min(largura, original), withoutEnlargement: true })
    .webp({ quality: Number(qualidade) })
    .toFile(saida)
  console.log(`${saida}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`)
}
