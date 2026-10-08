// Calculadora de câmbio portada do widget HTML do Elementor.
// Lógica, taxas, endpoints n8n e fluxo para o WhatsApp preservados; a diferença é que cada
// .cambio-calc da página vira uma instância independente (a página clonada tem duas).

const RATE_URL = 'https://n8n.prod.asupernova.com.br/webhook/9e92778f-35d7-4fba-b2c4-e3b7d7ae9731/'
const USD_RATES_URL = 'https://n8n.prod.asupernova.com.br/webhook/29282e92-0b93-47a2-b8c1-62d993ce0a1f'
const LEAD_URL = 'https://n8n.prod.asupernova.com.br/webhook/98ad2f58-bf0d-4576-808b-962da7f549a5'
const WHATSAPP_PHONE = '556240150505'

const foreignCurrencies = [
  { code: 'usd', name: 'Dólar Americano', flag: '🇺🇸' },
  { code: 'eur', name: 'Euro', flag: '🇪🇺' },
  { code: 'gbp', name: 'Libra Esterlina', flag: '🇬🇧' },
  { code: 'chf', name: 'Franco Suíço', flag: '🇨🇭' },
  { code: 'jpy', name: 'Iene Japonês', flag: '🇯🇵' },
  { code: 'cny', name: 'Yuan Chinês', flag: '🇨🇳' },
  { code: 'aud', name: 'Dólar Australiano', flag: '🇦🇺' },
  { code: 'cad', name: 'Dólar Canadense', flag: '🇨🇦' },
  { code: 'nzd', name: 'Dólar Neozelandês', flag: '🇳🇿' },
  { code: 'sgd', name: 'Dólar de Singapura', flag: '🇸🇬' },
  { code: 'hkd', name: 'Dólar de Hong Kong', flag: '🇭🇰' },
  { code: 'nok', name: 'Coroa Dinamarquesa', flag: '🇩🇰' },
  { code: 'czk', name: 'Coroa Tcheca', flag: '🇨🇿' },
  { code: 'mxn', name: 'Peso Mexicano', flag: '🇲🇽' },
  { code: 'try', name: 'Lira Turca', flag: '🇹🇷' },
  { code: 'zar', name: 'Rand Sul-Africano', flag: '🇿🇦' },
]

const iofRates = {
  'send-pf-investment': 0.011,
  'send-pf-other': 0.035,
  'receive-pf-investment': 0.0038,
  'receive-pf-other': 0.0038,
  'send-pj-investment': 0.011,
  'send-pj-other': 0.035,
  'receive-pj-investment': 0.0,
  'receive-pj-other': 0.0,
}

// Os webhooks do n8n às vezes levam 20 s+ para responder: cada busca tem tempo limite e uma nova tentativa.
const RATE_TIMEOUT_MS = 20000

async function fetchJson(url) {
  let lastError
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), RATE_TIMEOUT_MS)
    try {
      const req = await fetch(url, { signal: controller.signal })
      if (!req.ok) throw new Error(`HTTP ${req.status} em ${url}`)
      return await req.json()
    } catch (error) {
      lastError = error
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastError
}

// Cache compartilhado entre as calculadoras da página; falhas saem do cache para permitir nova tentativa.
let usdTablePromise
function loadUsdTable() {
  if (!usdTablePromise) {
    usdTablePromise = fetchJson(USD_RATES_URL).catch((error) => {
      usdTablePromise = null
      throw error
    })
  }
  return usdTablePromise
}

const ratePromises = {}
function loadRate(code) {
  if (!ratePromises[code]) {
    ratePromises[code] = (async () => {
      try {
        const data = await fetchJson(`${RATE_URL}${code.toUpperCase()}`)
        if (data && Number(data.value)) return Number(data.value)
      } catch (error) {
        console.error(error)
      }
      // Fallback: a tabela base USD dá a mesma cotação (BRL por unidade da moeda = BRL / moeda).
      const table = await loadUsdTable()
      const brl = Number(table.BRL)
      const perUsd = code === 'usd' ? 1 : Number(table[code.toUpperCase()])
      if (brl && perUsd) return brl / perUsd
      throw new Error(`Cotação indisponível para ${code}`)
    })().catch((error) => {
      delete ratePromises[code]
      throw error
    })
  }
  return ratePromises[code]
}

// Depois da moeda inicial, adianta as demais em segundo plano, poucas por vez para não sobrecarregar o n8n.
let prefetchStarted = false
function prefetchRates() {
  if (prefetchStarted) return
  prefetchStarted = true
  const queue = foreignCurrencies.map((c) => c.code)
  const worker = async () => {
    while (queue.length) await loadRate(queue.shift()).catch(() => {})
  }
  loadUsdTable().catch(() => {})
  for (let i = 0; i < 3; i++) worker()
}

function initCalculadora(root) {
  const $ = (id) => root.querySelector('#' + id)

  const state = {
    direction: 'send',
    userType: 'pf',
    foreignCurrency: 'usd',
    brlAmount: 0,
    foreignAmount: 0,
    isInvestment: true,
    loadingExchangeRate: true,
  }
  const exchangeRates = {}
  const usdExchangeRates = {}

  const sendButton = $('send-button')
  const receiveButton = $('receive-button')
  const slider = $('sliding-tab-slider')
  const brlLabel = $('brl-label')
  const foreignLabel = $('foreign-label')
  const entityTypeButton = $('entity-type-button')
  const entityTypeText = $('entity-type-text')
  const entityTypeArrow = $('entity-type-arrow')
  const entityTypeDropdown = $('entity-type-dropdown')
  const entityTypeFisica = $('entity-type-fisica')
  const entityTypeJuridica = $('entity-type-juridica')
  const foreignCurrencyButton = $('foreign-currency-button')
  const foreignCurrencyCode = $('foreign-currency-code')
  const foreignCurrencyFlag = $('foreign-currency-flag')
  const foreignCurrencyArrow = $('foreign-currency-arrow')
  const foreignCurrencyDropdown = $('foreign-currency-dropdown')
  const brlAmountInput = $('brl-amount-input')
  const foreignAmountInput = $('foreign-amount-input')
  const exchangeRateDisplay = $('exchange-rate-display')
  const detailsButton = $('details-button')
  const detailsModal = $('details-modal')
  const closeModalButton = $('close-modal-button')
  const modalIofValue = $('modal-iof-value')
  const modalSpreadValue = $('modal-spread-value')
  const modalVet = $('modal-vet')
  const modalCloseButton = $('modal-close-button')
  const modalPJDefaultCost = $('modal-pj-default-cost')
  const sendMoneyButton = $('send-money-button')
  const exclusivePopupModal = $('exclusive-popup-modal')
  const closeExclusivePopupButton = $('close-exclusive-popup-button')
  const pfFormModal = $('pf-form-modal')
  const closePfFormButton = $('close-pf-form-button')
  const pjFormModal = $('pj-form-modal')
  const closePjFormButton = $('close-pj-form-button')
  const goTotheAppButton = $('go-to-app-button')
  const knowTheCourseButton = $('know-the-course-button')
  const cpfInput = root.querySelectorAll('input[name="cpf"]')
  const cnpjInput = root.querySelector('input[name="cnpj"]')
  const cellphoneInput = root.querySelectorAll('input[name="cellphone"]')
  const formSubmitButton = root.querySelectorAll('button[type="submit"]')
  const investmentCheckboxContainer = $('investment-checkbox-container')
  const investmentCheckbox = $('investment-account-checkbox')
  const skeleton = $('skeleton')
  const dynamicTooltip = $('dynamic-tooltip')
  const tooltipContent = $('tooltip-content')

  // Os ids se repetem quando há duas calculadoras; o label passa a marcar o checkbox da própria instância.
  const investmentLabel = root.querySelector('label[for="investment-account-checkbox"]')
  if (investmentLabel) {
    investmentLabel.removeAttribute('for')
    investmentLabel.addEventListener('click', () => investmentCheckbox.click())
  }

  skeleton.classList.add('bg-gray-200', 'rounded-lg', 'h-full', 'w-full', 'absolute', 'top-0', 'left-0', 'z-[1000]')
  const skeletonHTML = `
    <div class="animate-pulse flex flex-col space-y-4 p-6">
      <div class="h-6 bg-gray-300 rounded w-3/4"></div>
      <div class="h-8 bg-gray-300 rounded w-full"></div>
      <div class="h-6 bg-gray-300 rounded w-1/2"></div>
      <div class="h-10 bg-gray-300 rounded w-full"></div>
      <div class="h-10 bg-gray-300 rounded w-full"></div>
      <div class="h-10 bg-gray-300 rounded w-full"></div>
      <div class="h-10 bg-gray-300 rounded w-full"></div>
      <div class="h-10 bg-gray-300 rounded w-full"></div>
      <div class="h-10 bg-gray-300 rounded w-full"></div>
    </div>`
  const errorHTML = `
    <div class="flex flex-col items-center justify-center text-center h-full gap-4 p-6">
      <p class="text-gray-700">Não foi possível carregar a cotação agora.</p>
      <button type="button" data-retry class="btn btn--primary">Tentar novamente</button>
    </div>`

  // 'loading' | 'error' | 'ready'
  const setRateStatus = (status) => {
    state.loadingExchangeRate = status !== 'ready'
    skeleton.classList.toggle('hidden', status === 'ready')
    if (status === 'loading') skeleton.innerHTML = skeletonHTML
    if (status === 'error') {
      skeleton.innerHTML = errorHTML
      skeleton.querySelector('[data-retry]').addEventListener('click', () => ensureRate(state.foreignCurrency))
    }
  }

  // Garante a cotação da moeda (e a tabela USD, usada no spread das demais moedas) antes de calcular.
  const ensureRate = async (code) => {
    const needsTable = code !== 'usd'
    if (exchangeRates[code] && (!needsTable || usdExchangeRates[code.toUpperCase()])) return true
    setRateStatus('loading')
    try {
      const [rate, table] = await Promise.all([loadRate(code), needsTable ? loadUsdTable() : null])
      exchangeRates[code] = rate
      if (table) Object.assign(usdExchangeRates, table)
    } catch (error) {
      console.error(error)
      if (state.foreignCurrency === code) setRateStatus('error')
      return false
    }
    // O usuário pode ter trocado de moeda enquanto esta carregava.
    if (state.foreignCurrency !== code) return false
    setRateStatus('ready')
    updateUI()
    calculateFromBRL(state.brlAmount)
    return true
  }

  const getAllExchangeRates = async () => {
    await ensureRate(state.foreignCurrency)
    prefetchRates()
  }

  const setFormLoading = (isLoading) => {
    formSubmitButton.forEach((button) => {
      button.disabled = isLoading
      if (isLoading) {
        button.classList.add('opacity-50', 'cursor-not-allowed')
        const pfFormMessage = $('pf-form-message')
        const pjFormMessage = $('pj-form-message')
        if (pfFormMessage) pfFormMessage.textContent = ''
        if (pjFormMessage) pjFormMessage.textContent = ''
      } else {
        button.classList.remove('opacity-50', 'cursor-not-allowed')
      }
    })
  }

  const submitForm = (form, pf) => {
    return new Promise(async (resolve, reject) => {
      try {
        setFormLoading(true)
        const data = new FormData(form)
        const cpf = unmaskCPF(data.get('cpf'))
        const cnpj = unmaskCNPJ(data.get('cnpj'))
        const cellphone = unmaskCellphone(data.get('cellphone'))
        const cpfError = isValidCPF(cpf)
        const cnpjError = isValidCNPJ(cnpj)
        if (cpfError instanceof Error) {
          alert(cpfError.message)
          setFormLoading(false)
          reject()
          return
        }
        if (cnpjError instanceof Error && !pf) {
          alert(cnpjError.message)
          setFormLoading(false)
          reject()
          return
        }
        const email = data.get('email').trim()
        const name = data.get('name').trim()
        if (!email || !name || !cellphone) {
          alert('Por favor, preencha todos os campos obrigatórios.')
          setFormLoading(false)
          reject()
          return
        }
        const payload = {
          email,
          name,
          cellphone,
          cpf,
          cnpj: !pf ? cnpj : null,
          userType: state.userType,
          brlAmount: state.brlAmount,
          foreignAmount: state.foreignAmount,
          foreignCurrency: state.foreignCurrency,
          isInvestment: state.isInvestment,
          direction: state.direction,
        }
        const req = await fetch(LEAD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!req.ok) {
          alert('Erro ao enviar os dados. Por favor, tente novamente mais tarde.')
          setFormLoading(false)
          reject()
          return
        }
        setFormLoading(false)
        resolve()
      } catch (error) {
        reject(error)
        console.error('Erro ao enviar o formulário:', error)
      }
    })
  }

  root.querySelectorAll('.interactive-term').forEach((term) => {
    term.addEventListener('mouseenter', (e) => {
      const content = e.target.getAttribute('data-tooltip-content')
      if (content) {
        tooltipContent.textContent = content
        dynamicTooltip.classList.add('show')
        updateTooltipPosition(e.target)
      }
    })
    term.addEventListener('mouseleave', () => {
      dynamicTooltip.classList.remove('show')
    })
  })

  // O tooltip é position: fixed, então usa as coordenadas da viewport (o original somava o scroll).
  function updateTooltipPosition(target) {
    const rect = target.getBoundingClientRect()
    const tooltipRect = dynamicTooltip.getBoundingClientRect()
    const tooltipArrow = dynamicTooltip.querySelector('.tooltip-arrow-dynamic')
    let topPosition = rect.top - tooltipRect.height - 10
    if (topPosition < 0) {
      topPosition = rect.bottom + 10
      tooltipArrow.style.transform = 'rotate(45deg) translateX(-50%)'
      tooltipArrow.style.top = '-5px'
      tooltipArrow.style.bottom = 'auto'
    } else {
      tooltipArrow.style.transform = 'rotate(45deg) translateX(-50%)'
      tooltipArrow.style.top = 'auto'
      tooltipArrow.style.bottom = '-5px'
    }
    dynamicTooltip.style.top = `${topPosition}px`
    dynamicTooltip.style.left = `${rect.left + rect.width / 2}px`
  }

  const formatCurrency = (value) => {
    if (isNaN(value)) return '0,00'
    return value.toFixed(2).replace('.', ',')
  }
  const formatExchangeRate = (value) => {
    if (isNaN(value)) return '0,0000'
    return value.toFixed(4).replace('.', ',')
  }

  const getSpreadRate = (foreignValue, foreignCurrency) => {
    const { userType } = state
    let value = foreignValue
    const exchangeRate = foreignCurrency === 'usd' ? 1 : usdExchangeRates[foreignCurrency.toUpperCase()]
    value = value / exchangeRate
    let ranges = []
    if (userType === 'pj') {
      ranges = [
        { max: 2499.99, rate: 0.015 },
        { max: 4999.99, rate: 0.01 },
        { max: 9999.99, rate: 0.005 },
        { max: Number.MAX_SAFE_INTEGER, rate: 0.0025 },
      ]
    }
    if (userType === 'pf') {
      ranges = [
        { max: 25000, rate: 0.015 },
        { max: 50000, rate: 0.0135 },
        { max: 100000, rate: 0.0128 },
        { max: 250000, rate: 0.012 },
        { max: 500000, rate: 0.0105 },
        { max: 1000000, rate: 0.0098 },
        { max: Number.MAX_SAFE_INTEGER, rate: 0.009 },
      ]
    }
    let rate = 0.015
    for (const range of ranges) {
      if (value <= range.max) {
        rate = range.rate
        break
      }
    }
    return rate
  }

  // VET = câmbio + spread + IOF; para PJ soma o custo fixo de R$ 90 diluído na quantidade.
  const calculateVET = (exchangeRate, iofRate, spreadRate) => {
    const { userType, brlAmount } = state
    let VET = exchangeRate * (1 + spreadRate + iofRate)
    if (userType !== 'pj' || !brlAmount) return VET
    const quantity = brlAmount / VET
    VET = VET * quantity
    VET = VET + 90
    VET = VET / quantity
    return VET
  }

  const calculateEffectiveReceiveRate = (exchangeRate, iofRate, spreadRate) => {
    return exchangeRate * (1 - spreadRate - iofRate)
  }

  const getCurrentIofRate = () => {
    const { direction, userType, isInvestment } = state
    if (userType === 'pf') {
      if (direction === 'send') {
        return isInvestment ? iofRates['send-pf-investment'] : iofRates['send-pf-other']
      }
      return isInvestment ? iofRates['receive-pf-investment'] : iofRates['receive-pf-other']
    }
    if (direction === 'send') {
      return isInvestment ? iofRates['send-pj-investment'] : iofRates['send-pj-other']
    }
    return iofRates['receive-pj-investment']
  }

  const updateUI = () => {
    const { direction, userType, foreignCurrency, brlAmount, foreignAmount, isInvestment } = state
    brlLabel.textContent = direction === 'send' ? 'Você envia' : 'Você recebe'
    foreignLabel.textContent = direction === 'send' ? 'Beneficiário recebe' : 'Você envia'
    slider.style.left = direction === 'send' ? '4px' : 'calc(50% + 4px)'
    entityTypeText.textContent = userType === 'pf' ? 'pessoa física' : 'pessoa jurídica'

    const isSendingPf = direction === 'send' && userType === 'pf'
    if (isSendingPf) {
      investmentCheckboxContainer.classList.add('visible')
      investmentCheckbox.checked = isInvestment
    } else {
      investmentCheckboxContainer.classList.remove('visible')
      state.isInvestment = true
      investmentCheckbox.checked = true
    }

    const currency = foreignCurrencies.find((c) => c.code === foreignCurrency)
    foreignCurrencyFlag.textContent = currency.flag
    foreignCurrencyCode.textContent = currency.code.toUpperCase()

    const exchangeRate = exchangeRates[foreignCurrency]
    const spreadRate = getSpreadRate(foreignAmount, foreignCurrency)
    const iofRate = getCurrentIofRate()
    // Nos dois sentidos o original exibe o VET de envio.
    const displayRate = calculateVET(exchangeRate, iofRate, spreadRate)

    exchangeRateDisplay.textContent = `1 ${foreignCurrency.toUpperCase()} = BRL ${formatExchangeRate(displayRate)}`
    exchangeRateDisplay.classList.remove('vet-changed')
    void exchangeRateDisplay.offsetWidth
    exchangeRateDisplay.classList.add('vet-changed')

    if (document.activeElement !== brlAmountInput) brlAmountInput.value = formatCurrency(brlAmount)
    if (document.activeElement !== foreignAmountInput) foreignAmountInput.value = formattedCurrency(foreignAmount)

    modalIofValue.textContent = `R$ ${formatCurrency(brlAmount * iofRate)}`
    modalSpreadValue.textContent = `R$ ${formatCurrency(brlAmount * spreadRate)}`
    const vetForModal = calculateVET(exchangeRates[foreignCurrency], iofRate, spreadRate)
    modalVet.textContent = `1 ${foreignCurrency.toUpperCase()} = BRL ${formatExchangeRate(vetForModal)}`
    modalPJDefaultCost.style.display = userType === 'pj' ? 'flex' : 'none'
  }

  const calculateFromBRL = (brlValue) => {
    const { foreignCurrency, direction } = state
    const exchangeRate = exchangeRates[foreignCurrency]
    const iofRate = getCurrentIofRate()
    const spreadRate = getSpreadRate(state.foreignAmount, foreignCurrency)
    let convertedAmount = 0
    if (direction === 'send') {
      convertedAmount = brlValue / calculateVET(exchangeRate, iofRate, spreadRate)
    } else {
      convertedAmount = brlValue / calculateEffectiveReceiveRate(exchangeRate, iofRate, spreadRate)
    }
    state.brlAmount = brlValue
    state.foreignAmount = convertedAmount
    updateUI()
  }

  const calculateFromForeign = (foreignValue) => {
    const { foreignCurrency, direction } = state
    const exchangeRate = exchangeRates[foreignCurrency]
    const iofRate = getCurrentIofRate()
    const spreadRate = getSpreadRate(foreignValue, foreignCurrency)
    let convertedAmount = 0
    if (direction === 'send') {
      convertedAmount = foreignValue * calculateVET(exchangeRate, iofRate, spreadRate)
    } else {
      convertedAmount = foreignValue * calculateEffectiveReceiveRate(exchangeRate, iofRate, spreadRate)
    }
    state.foreignAmount = foreignValue
    state.brlAmount = convertedAmount
    updateUI()
  }

  sendButton.addEventListener('click', () => {
    state.direction = 'send'
    updateUI()
    calculateFromForeign(state.foreignAmount)
    sendMoneyButton.textContent = 'Enviar dinheiro'
  })
  receiveButton.addEventListener('click', () => {
    state.direction = 'receive'
    updateUI()
    calculateFromForeign(state.foreignAmount)
    sendMoneyButton.textContent = 'Receber dinheiro'
  })

  entityTypeButton.addEventListener('click', () => {
    const isHidden = entityTypeDropdown.classList.toggle('hidden')
    entityTypeArrow.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)'
  })
  entityTypeFisica.addEventListener('click', () => {
    state.userType = 'pf'
    entityTypeDropdown.classList.add('hidden')
    entityTypeArrow.style.transform = 'rotate(0deg)'
    updateUI()
    calculateFromForeign(state.foreignAmount)
  })
  entityTypeJuridica.addEventListener('click', () => {
    state.userType = 'pj'
    entityTypeDropdown.classList.add('hidden')
    entityTypeArrow.style.transform = 'rotate(0deg)'
    updateUI()
    calculateFromForeign(state.foreignAmount)
  })

  const populateForeignCurrencyDropdown = () => {
    foreignCurrencies.forEach((currency) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.classList.add('block', 'w-full', 'text-left', 'p-3', 'hover:bg-gray-100', 'transition-colors', 'duration-150', 'flex', 'items-center', 'space-x-2')
      button.dataset.currency = currency.code
      button.innerHTML = `<span class="currency-flag text-2xl">${currency.flag}</span><span>${currency.name} (${currency.code.toUpperCase()})</span>`
      button.addEventListener('click', () => {
        state.foreignCurrency = currency.code
        foreignCurrencyDropdown.classList.add('hidden')
        foreignCurrencyArrow.style.transform = 'rotate(0deg)'
        updateUI()
        if (exchangeRates[currency.code]) calculateFromBRL(state.brlAmount)
        // Se a cotação ainda não chegou, ensureRate mostra o carregamento e recalcula quando ela chegar.
        ensureRate(currency.code)
      })
      foreignCurrencyDropdown.appendChild(button)
    })
  }

  foreignCurrencyButton.addEventListener('click', () => {
    const isHidden = foreignCurrencyDropdown.classList.toggle('hidden')
    foreignCurrencyArrow.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)'
  })

  // Reatribui o valor para o cursor ir ao fim do campo.
  brlAmountInput.addEventListener('focus', (e) => {
    const value = e.target.value
    e.target.value = ''
    e.target.value = value
  })
  foreignAmountInput.addEventListener('focus', (e) => {
    const value = e.target.value
    e.target.value = ''
    e.target.value = value
  })
  brlAmountInput.addEventListener('input', (e) => {
    const raw = handleCurrencyChange(e.target.value)
    calculateFromBRL(raw)
    e.target.value = formattedCurrency(raw)
  })
  foreignAmountInput.addEventListener('input', (e) => {
    const raw = handleCurrencyChange(e.target.value)
    calculateFromForeign(raw)
    e.target.value = formattedCurrency(raw)
  })

  cpfInput.forEach((input) => input.addEventListener('input', (e) => { e.target.value = maskCPF(e.target.value) }))
  cnpjInput.addEventListener('input', (e) => { e.target.value = maskCNPJ(e.target.value) })
  cellphoneInput.forEach((input) => input.addEventListener('input', (e) => { e.target.value = maskCellphone(e.target.value) }))

  investmentCheckbox.addEventListener('change', (e) => {
    state.isInvestment = e.target.checked
    updateUI()
    calculateFromBRL(state.brlAmount)
  })

  detailsButton.addEventListener('click', () => detailsModal.classList.remove('hidden'))
  closeModalButton.addEventListener('click', () => detailsModal.classList.add('hidden'))
  modalCloseButton.addEventListener('click', () => detailsModal.classList.add('hidden'))

  // Abaixo de 5.000 USD (convertido) o envio é exclusivo para alunos; acima abre o formulário PF/PJ.
  sendMoneyButton.addEventListener('click', () => {
    const { foreignCurrency, foreignAmount } = state
    let value = foreignAmount
    const exchangeRate = foreignCurrency === 'usd' ? 1 : usdExchangeRates[foreignCurrency.toUpperCase()]
    value = value / exchangeRate
    if (state.direction === 'send' && value < 5000) {
      exclusivePopupModal.classList.remove('hidden')
    } else if (state.userType === 'pf') {
      pfFormModal.classList.remove('hidden')
    } else {
      pjFormModal.classList.remove('hidden')
    }
  })
  closeExclusivePopupButton.addEventListener('click', () => exclusivePopupModal.classList.add('hidden'))

  const showFormMessage = (form, message) => {
    const messageElement = $(`${form}-form-message`)
    messageElement.textContent = message
    messageElement.classList.remove('hidden')
    setTimeout(() => messageElement.classList.add('hidden'), 5000)
  }

  const goToWhatsapp = () => {
    const currencyDetails = `${state.foreignCurrency.toUpperCase()} ${formattedCurrency(state.foreignAmount)} (BRL ${formattedCurrency(state.brlAmount)})`
    const message = `Olá, simulei meu câmbio e quero ${state.direction === 'send' ? 'enviar' : 'receber'} ${currencyDetails}!`
    window.location.href = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(message)}`
    pjFormModal.classList.add('hidden')
  }

  $('pf-form').addEventListener('submit', (e) => {
    e.preventDefault()
    submitForm(e.target, true)
      .then(goToWhatsapp)
      .catch(() => {
        setFormLoading(false)
        showFormMessage('pf', 'Erro ao enviar o formulário. Por favor, tente novamente mais tarde.')
      })
  })
  $('pj-form').addEventListener('submit', (e) => {
    e.preventDefault()
    submitForm(e.target, false)
      .then(goToWhatsapp)
      .catch(() => {
        setFormLoading(false)
        showFormMessage('pj', 'Erro ao enviar o formulário. Por favor, tente novamente mais tarde.')
      })
  })

  closePfFormButton.addEventListener('click', () => pfFormModal.classList.add('hidden'))
  closePjFormButton.addEventListener('click', () => pjFormModal.classList.add('hidden'))

  goTotheAppButton.addEventListener('click', () => {
    exclusivePopupModal.classList.add('hidden')
    const device = navigator.userAgent.toLowerCase()
    if (device.includes('android')) {
      window.location.href = 'https://play.google.com/store/apps/details?id=com.btg.pactual.digital.mobile'
    } else {
      window.location.href = 'https://apps.apple.com/br/app/btg-pactual-investimentos/id1041958375'
    }
  })

  knowTheCourseButton.addEventListener('click', () => {
    const currentUTMs = new URLSearchParams(window.location.search)
    const utmSource = currentUTMs.get('utm_source') || 'auvp_capital'
    const utmMedium = currentUTMs.get('utm_medium') || 'cambio'
    const utmCampaign = currentUTMs.get('utm_campaign') || 'cambio_course'
    const utmContent = currentUTMs.get('utm_content') || 'know_the_course'
    const utmParams = `?utm_source=${utmSource}&utm_medium=${utmMedium}&utm_campaign=${utmCampaign}&utm_content=${utmContent}`
    window.open(`https://form.auvp.com.br/to/DSo4JgH8${utmParams}`, '_blank')
  })

  populateForeignCurrencyDropdown()
  getAllExchangeRates()
  updateUI()
}

// ----- Máscaras e validações (iguais ao widget original) -----

const excludedCNPJ = ['00000000000000', '11111111111111', '22222222222222', '33333333333333', '44444444444444', '55555555555555', '66666666666666', '77777777777777', '88888888888888', '99999999999999']

function maskCNPJ(value) {
  if (!value || value === 'undefined' || value === 'null') return ''
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1')
}

function unmaskCNPJ(value) {
  if (!value || value === 'undefined' || value === 'null') return ''
  return value.replace(/\D/g, '')
}

function isValidCNPJ(cnpj) {
  if (!cnpj) return new Error('Este CNPJ é inválido')
  if (cnpj.length !== 14 || excludedCNPJ.includes(cnpj)) return new Error('Este CNPJ é inválido')
  let size = cnpj.length - 2
  let numbers = cnpj.substring(0, size)
  const digits = cnpj.substring(size)
  let sum = 0
  let pos = size - 7
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(0))) return new Error('Este CNPJ é inválido')
  size = size + 1
  numbers = cnpj.substring(0, size)
  sum = 0
  pos = size - 7
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(1))) return new Error('Este CNPJ é inválido')
  return null
}

const invalidCPF = ['00000000000', '11111111111', '22222222222', '33333333333', '44444444444', '55555555555', '66666666666', '77777777777', '88888888888']

function maskCPF(value) {
  if (!value || value === 'undefined' || value === 'null') return ''
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1')
}

function unmaskCPF(value) {
  if (!value || value === 'undefined' || value === 'null') return ''
  if (typeof value !== 'string') throw new Error('O valor deve ser uma string')
  return value.replace(/\D/g, '')
}

function isValidCPF(value) {
  if (value.length !== 11) return new Error('Este CPF é inválido')
  if (invalidCPF.includes(value)) return new Error('Este CPF é inválido')
  const cpfSplitted = value.split('')
  const firstDigit = cpfSplitted[9]
  const firstDigitSum = cpfSplitted.slice(0, 9).map((number, index) => parseInt(number) * (10 - index)).reduce((acc, number) => acc + number, 0)
  const firstDigitResult = (firstDigitSum * 10) % 11
  const firstDigitResultFormatted = firstDigitResult === 10 ? 0 : firstDigitResult
  if (firstDigitResultFormatted !== parseInt(firstDigit)) return new Error('Este CPF é inválido')
  const secondDigit = cpfSplitted[10]
  const secondDigitSum = cpfSplitted.slice(0, 10).map((number, index) => parseInt(number) * (11 - index)).reduce((acc, number) => acc + number, 0)
  const secondDigitResult = (secondDigitSum * 10) % 11
  const secondDigitResultFormatted = secondDigitResult === 10 ? 0 : secondDigitResult
  if (secondDigitResultFormatted !== parseInt(secondDigit)) return new Error('Este CPF é inválido')
  return null
}

function maskCellphone(value) {
  if (!value || value === 'undefined' || value === 'null') return ''
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{1})(\d{4})(\d{4})/, '$1 $2-$3')
    .replace(/(-\d{4})\d+?$/, '$1')
}

function unmaskCellphone(value) {
  if (!value || value === 'undefined' || value === 'null') return ''
  return value.replace(/\D/g, '')
}

// Formata número no padrão brasileiro (1.234,56).
function formattedCurrency(input) {
  const string = Math.abs(input).toFixed(2)
  const parts = string.split('.')
  const buffer = []
  let number = parts[0]
  while (number.length > 0) {
    buffer.unshift(number.substr(Math.max(0, number.length - 3), 3))
    number = number.substr(0, number.length - 3)
  }
  let formattedNumber = buffer.join('.')
  const decimals = parts[1]
  if (decimals) formattedNumber += ',' + decimals
  return (input < 0 ? '-' : '') + formattedNumber
}

// Interpreta o texto digitado como centavos (digitar "123" vira 1,23).
function handleCurrencyChange(text) {
  const isNegativeValue = text.includes('-')
  const textNumericValue = text.replace(/\D+/g, '')
  const numberValue = Number(textNumericValue) * (isNegativeValue ? -1 : 1)
  const zerosOnValue = textNumericValue.replace(/[^0]/g, '').length
  if (!textNumericValue || (!numberValue && zerosOnValue === 2)) return null
  return numberValue / 10 ** 2
}

document.querySelectorAll('.cambio-calc').forEach(initCalculadora)
