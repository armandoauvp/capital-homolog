// FAQ do AUPO11 (portado do widget HTML do Elementor): acordeão (details.faq__item do base.css),
// busca nas perguntas/respostas e vídeos sob demanda.

// Vídeos de simulação de compra. Ainda apontam para o WordPress antigo:
// devem migrar para uma hospedagem de vídeo (YouTube, Vimeo, Bunny etc.) e basta trocar as URLs aqui.
const VIDEOS = {
  btg: "https://auvpcapital.com.br/wp-content/uploads/2025/12/SIMULACAO-COMPRA-DE-ETF-BTG_-FINAL-EXPORT-1.mp4",
  ion: "https://auvpcapital.com.br/wp-content/uploads/2025/12/SIMULACAO-COMPRA-DE-ETF-ION_-FINAL-EXPORT-1.mp4",
  nubank: "https://auvpcapital.com.br/wp-content/uploads/2025/12/SIMULACAO-COMPRA-DE-ETF-NUBANK_-FINAL-EXPORT-1.mp4",
  xp: "https://auvpcapital.com.br/wp-content/uploads/2025/12/SIMULACAO-COMPRA-DE-ETF-XP_-FINAL-EXPORT-1.mp4",
};

const escapeHtml = (text) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Texto da resposta para a busca: sem o fallback do <video> e com espaço entre blocos
// (innerText não serve porque o conteúdo do <details> fechado não é renderizado).
function answerText(answer) {
  const clone = answer.cloneNode(true);
  clone.querySelectorAll("video").forEach((video) => video.remove());
  clone.querySelectorAll("p, li, ul, ol, div").forEach((el) => el.append(" "));
  return clone.textContent.replace(/\s+/g, " ").trim();
}

document.addEventListener("DOMContentLoaded", function () {
  const faqWidget = document.getElementById("auvp-faq-widget");
  const faqItems = Array.from(faqWidget.querySelectorAll("details.faq__item"));

  // Só carrega o MP4 quando a pergunta é aberta (os arquivos são grandes)
  function loadVideos(item) {
    item.querySelectorAll("video[data-video]:not([src])").forEach((video) => {
      const url = VIDEOS[video.dataset.video];
      if (url) video.src = url;
    });
  }

  function openItem(item) {
    item.open = true;
    loadVideos(item);
  }

  faqItems.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (item.open) {
        loadVideos(item);
        // O atributo name já deixa um aberto por vez; isto cobre navegadores sem suporte
        faqItems.forEach((other) => { if (other !== item) other.open = false; });
      } else {
        item.querySelectorAll("video").forEach((video) => video.pause());
      }
    });
  });

  const searchInput = document.getElementById("faq-search-input");
  const searchResults = document.getElementById("search-results");
  const searchIndex = faqItems.map((item, index) => ({
    id: index,
    element: item,
    question: item.querySelector("summary").textContent.trim(),
    answer: answerText(item.querySelector(".faq__answer")),
  }));

  function highlightText(text, query) {
    const regex = new RegExp(`(${escapeRegExp(escapeHtml(query))})`, "gi");
    return escapeHtml(text).replace(regex, '<span class="highlight-match">$1</span>');
  }

  function getSnippet(fullText, query) {
    const lowerText = fullText.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    if (index === -1) return escapeHtml(fullText.substring(0, 100)) + "...";
    const start = Math.max(0, index - 40);
    const end = Math.min(fullText.length, index + query.length + 60);
    let snippet = fullText.substring(start, end);
    if (start > 0) snippet = "..." + snippet;
    if (end < fullText.length) snippet = snippet + "...";
    return highlightText(snippet, query);
  }

  function clearResults() {
    searchResults.innerHTML = "";
    searchResults.classList.remove("has-results");
  }

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) {
      clearResults();
      return;
    }
    const lowerQuery = query.toLowerCase();
    const results = searchIndex.filter((item) => {
      return item.question.toLowerCase().includes(lowerQuery) || item.answer.toLowerCase().includes(lowerQuery);
    });
    if (results.length > 0) {
      searchResults.innerHTML = results
        .map((res) => {
          const matchInQuestion = res.question.toLowerCase().includes(lowerQuery);
          const displaySnippet = matchInQuestion ? "Encontrado no título" : getSnippet(res.answer, query);
          const displayTitle = highlightText(res.question, query);
          return `
            <div class="search-result-item" data-index="${res.id}">
              <span class="result-title">${displayTitle}</span>
              <span class="result-snippet">${displaySnippet}</span>
            </div>`;
        })
        .join("");
      searchResults.classList.add("has-results");
      searchResults.querySelectorAll(".search-result-item").forEach((el) => {
        el.addEventListener("click", () => {
          const targetItem = searchIndex[el.getAttribute("data-index")].element;
          searchInput.value = "";
          clearResults();
          openItem(targetItem);
          targetItem.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      });
    } else {
      searchResults.innerHTML = '<div class="no-results">Nenhum resultado encontrado.</div>';
      searchResults.classList.add("has-results");
    }
  });

  document.addEventListener("click", (e) => {
    if (!document.getElementById("search-container").contains(e.target)) clearResults();
  });
});
