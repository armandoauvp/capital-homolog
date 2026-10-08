// Comportamento global: rastreamento, repasse de UTMs e menu do cabeçalho.

// Rastreamento só em produção, para não sujar os dados com acessos locais.
if (import.meta.env.PROD) {
  // Google Tag Manager
  ;(function (w, d, s, l, i) {
    w[l] = w[l] || []
    w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' })
    const f = d.getElementsByTagName(s)[0]
    const j = d.createElement(s)
    j.async = true
    j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + (l != 'dataLayer' ? '&l=' + l : '')
    f.parentNode.insertBefore(j, f)
  })(window, document, 'script', 'dataLayer', 'GTM-MRXLB32L')

  // Microsoft Clarity
  ;(function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments) }
    t = l.createElement(r)
    t.async = 1
    t.src = 'https://www.clarity.ms/tag/' + i
    y = l.getElementsByTagName(r)[0]
    y.parentNode.insertBefore(t, y)
  })(window, document, 'clarity', 'script', 'sklzt5vymm')
}

// Repassa UTMs, ref_nome, product_id e user_id da URL atual para links de formulário e checkout.
// Une os 4 scripts do site antigo: links do Typeform geral (nrLyZhc6), #checkout, #tflink e [data-utm].
function forwardParams() {
  const params = new URLSearchParams(window.location.search)
  const refNome = params.get('ref_nome')
  if (refNome) {
    try { localStorage.setItem('ref_nome', refNome) } catch {}
  }

  const selector = 'a[href*="form.auvp.com.br/to/nrLyZhc6"], a#checkout, a#tflink, a[data-utm]'
  document.querySelectorAll(selector).forEach((a) => {
    let url
    try { url = new URL(a.getAttribute('href'), window.location.href) } catch { return }
    // Typeform geral não recebia utm_term padrão; os demais recebiam a data do dia.
    const isGeneralForm = url.href.includes('nrLyZhc6') && a.id !== 'checkout' && a.id !== 'tflink'
    const values = {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: refNome || params.get('utm_campaign'),
      utm_content: params.get('utm_content'),
      utm_term: params.get('utm_term') ?? (isGeneralForm ? null : new Date().toISOString().split('T')[0]),
      product_id: params.get('product_id'),
      user_id: params.get('user_id'),
    }
    for (const [key, value] of Object.entries(values)) if (value) url.searchParams.set(key, value)
    a.setAttribute('href', url.toString())
    a.setAttribute('target', '_blank')
  })
}

function setupHeader() {
  const header = document.querySelector('.site-header')
  if (!header) return
  const toggle = header.querySelector('.site-header__toggle')
  toggle?.addEventListener('click', () => {
    const open = header.classList.toggle('is-open')
    toggle.setAttribute('aria-expanded', String(open))
  })
  header.querySelectorAll('.site-nav__trigger').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.site-nav__item')
      const open = item.classList.toggle('is-open')
      btn.setAttribute('aria-expanded', String(open))
    })
  })
  document.addEventListener('click', (e) => {
    if (header.contains(e.target)) return
    header.querySelectorAll('.site-nav__item.is-open').forEach((i) => i.classList.remove('is-open'))
  })
}

forwardParams()
setupHeader()
