// Planos: escolha do plano (partnerId) e popup de transferência de conta BTG.
// Portado dos widgets HTML 5d88d4d (cards) e 73f40420 (popup 1899) do Elementor.

const popup = document.getElementById('transfer-popup')

// Widget 01: cada botão grava o código do assessor do plano escolhido
const partnerIds = { 'plan-1': '1170364', 'plan-2': '6105441', 'plan-3': '9542247' }
for (const [id, partnerId] of Object.entries(partnerIds)) {
  document.getElementById(id)?.addEventListener('click', () => {
    localStorage.setItem('partnerId', partnerId)
    openPopup()
  })
}

function openPopup() {
  // Sempre recomeça na pergunta inicial
  document.getElementById('first-step').hidden = false
  document.getElementById('account-transfer').hidden = true
  popup.showModal()
}

function closePopup() {
  popup.close()
}

popup.querySelector('[data-close-popup]').addEventListener('click', closePopup)
// Clique no fundo escuro fecha
popup.addEventListener('click', (e) => { if (e.target === popup) closePopup() })
// Para o vídeo ao fechar
popup.addEventListener('close', () => {
  const iframe = popup.querySelector('#partner-video iframe')
  if (iframe) iframe.src = iframe.src
})

function getStoredPartnerId() {
  const urlParams = new URLSearchParams(window.location.search)
  const partnerIdParam = urlParams.get('partnerId')
  return partnerIdParam || localStorage.getItem('partnerId')
}

// Widget 03: "Sim, possuo" mostra o passo a passo com código, vídeo e mensagem do plano
document.getElementById('show-account-transfer').onclick = function () {
  const storedPartnerId = getStoredPartnerId()
  if (!storedPartnerId) return
  const spanEl = document.getElementById('spanPartnerId')
  if (spanEl) spanEl.textContent = storedPartnerId

  const partnerVideoEl = document.querySelector('#partner-video .transfer-popup__video-inner')
  function setPartnerVideo(id) {
    if (!partnerVideoEl) return
    partnerVideoEl.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}" title="Como transferir sua conta" allowfullscreen></iframe>`
  }

  // Vídeo padrão do widget no Elementor, usado quando o código não é de nenhum plano
  setPartnerVideo('L0wZJ2p6QUY')
  const footer = document.getElementById('partner-popup-footer')
  footer.innerHTML = ''
  if (storedPartnerId === '1170364') {
    footer.innerHTML = 'Pronto! Em até 48 horas úteis a mudança será concluída, e você estará na base correspondente ao plano "Se vira aí".<br><br>Caso tenha dúvidas, estamos aqui para ajudar!'
    setPartnerVideo('mXDEFJpgZJs')
  }
  if (storedPartnerId === '6105441') {
    footer.innerHTML = 'Pronto! Em até 48 horas úteis a mudança será concluída, e você passará a contar com o suporte da AUVP Capital.<br><br>Caso tenha dúvidas, estamos aqui para ajudar!'
    setPartnerVideo('Yo0dnXEmFFM')
  }
  if (storedPartnerId === '9542247') {
    footer.innerHTML = 'Pronto! Em até 48 horas úteis a mudança será concluída, e você passará a contar com o suporte da AUVP Capital.<br><br>Mas fique tranquilo: o processo só estará totalmente concluído quando um de nossos consultores de investimentos entrar em contato com você. Enquanto isso, você já pode contar com o suporte do nosso time.<br><br>Caso tenha dúvidas, estamos aqui para ajudar!'
    setPartnerVideo('j6Uozsh2f6E')
  }

  document.getElementById('first-step').hidden = true
  document.getElementById('account-transfer').hidden = false
}

// "Não, quero abrir": cadastro no BTG já vinculado ao assessor do plano
document.getElementById('redirect-create-account').onclick = function () {
  const storedPartnerId = getStoredPartnerId()
  if (!storedPartnerId) return
  const redirectUrl = `https://investimentos.btgpactual.com/cadastro/?assessor=${storedPartnerId}`
  window.open(redirectUrl, '_blank')
  closePopup()
}
