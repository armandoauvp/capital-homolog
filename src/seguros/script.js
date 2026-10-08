// Flip boxes: mouse usa :hover e teclado usa :focus-visible (CSS).
// Em telas de toque não há hover, então o toque alterna a face (um card aberto por vez).
const canHover = window.matchMedia('(hover: hover)')
const flips = document.querySelectorAll('.sg-flip')

flips.forEach((card) => {
  card.addEventListener('click', () => {
    if (canHover.matches) return
    const open = !card.classList.contains('is-flipped')
    flips.forEach((c) => c.classList.remove('is-flipped'))
    card.classList.toggle('is-flipped', open)
  })
})
