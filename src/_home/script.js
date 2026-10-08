// Home: carrossel de depoimentos e duplicação dos logos da faixa da mídia.

function setupDepoimentos() {
  const root = document.querySelector('[data-carousel]')
  if (!root) return
  const slides = [...root.querySelectorAll('.home-depoimento')]
  const dots = root.querySelector('.home-depoimentos__dots')
  let current = 0
  let timer

  const buttons = slides.map((_, i) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.setAttribute('role', 'tab')
    b.setAttribute('aria-label', `Depoimento ${i + 1}`)
    b.addEventListener('click', () => { go(i); restart() })
    dots.appendChild(b)
    return b
  })

  function go(i) {
    current = (i + slides.length) % slides.length
    slides.forEach((s, k) => s.classList.toggle('is-active', k === current))
    buttons.forEach((b, k) => b.setAttribute('aria-selected', String(k === current)))
  }

  // Autoplay de 5s com pausa no hover, como no original
  const start = () => { timer = setInterval(() => go(current + 1), 5000) }
  const stop = () => clearInterval(timer)
  const restart = () => { stop(); start() }
  root.addEventListener('mouseenter', stop)
  root.addEventListener('mouseleave', start)

  // Swipe no celular
  let x0 = null
  root.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX }, { passive: true })
  root.addEventListener('touchend', (e) => {
    if (x0 === null) return
    const dx = e.changedTouches[0].clientX - x0
    if (Math.abs(dx) > 40) { go(current + (dx < 0 ? 1 : -1)); restart() }
    x0 = null
  })

  go(0)
  start()
}

// Duplica os logos: o .ds-marquee__track precisa do conteúdo repetido para fechar o loop sem "pulo".
function setupMidia() {
  const track = document.querySelector('.home-midia__track')
  if (!track) return
  ;[...track.children].forEach((li) => {
    const clone = li.cloneNode(true)
    clone.setAttribute('aria-hidden', 'true')
    clone.querySelector('a')?.setAttribute('tabindex', '-1')
    track.appendChild(clone)
  })
}

setupDepoimentos()
setupMidia()
