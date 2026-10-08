// Busca: filtra os cards por nome, caminho ou descrição e esconde os grupos que ficam vazios.
const input = document.querySelector('[data-search]')
const empty = document.querySelector('[data-empty]')
const groups = [...document.querySelectorAll('.pg-group')]

// Ignora acentos e maiúsculas ("cambio" encontra "Câmbio").
const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const cards = [...document.querySelectorAll('.pg-grid > li')].map((li) => ({ li, text: normalize(li.textContent) }))

document.querySelector('[data-total]').textContent = cards.length

input.addEventListener('input', () => {
  const terms = normalize(input.value).split(/\s+/).filter(Boolean)
  for (const card of cards) card.li.hidden = !terms.every((t) => card.text.includes(t))
  let visible = 0
  for (const group of groups) {
    const count = group.querySelectorAll('.pg-grid > li:not([hidden])').length
    group.hidden = count === 0
    visible += count
  }
  empty.hidden = visible > 0
})
