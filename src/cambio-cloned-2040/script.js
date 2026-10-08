// Acordeão dos diferenciais (portado do widget HTML): abre um item por vez; clicar no aberto fecha.
document.querySelectorAll('.accordion-header').forEach((header) => {
  header.addEventListener('click', () => {
    const item = header.parentElement
    const accordion = item.parentElement
    accordion.querySelectorAll('.accordion-item').forEach((i) => {
      if (i !== item) {
        i.classList.remove('active')
        i.querySelector('.accordion-header').setAttribute('aria-expanded', 'false')
      }
    })
    const open = item.classList.toggle('active')
    header.setAttribute('aria-expanded', String(open))
  })
})
