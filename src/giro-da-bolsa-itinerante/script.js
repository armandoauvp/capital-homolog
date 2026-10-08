// Script da landing Giro da Bolsa Itinerante, portado do shortcode original.
// Roda como módulo (o Vite só empacota scripts type="module"); por isso as funções
// chamadas pelos onclick do HTML são expostas em window no final do arquivo.
// Ícones Lucide (v0.469) embutidos: a página só usa 2, então trocamos os <i data-lucide>
// pelo mesmo SVG que lucide.createIcons() gerava, sem baixar a biblioteca inteira (~80 KB).
(function () {
    var ICONES = {
        'arrow-right': '<path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path>',
        'check-circle-2': '<circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path>'
    };
    function _runLucide() {
        document.querySelectorAll('i[data-lucide]').forEach(function (el) {
            var nome = el.getAttribute('data-lucide');
            if (!ICONES[nome]) return;
            var tmp = document.createElement('div');
            tmp.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-lucide="' + nome + '">' + ICONES[nome] + '</svg>';
            var svg = tmp.firstChild;
            svg.setAttribute('class', ('lucide lucide-' + nome + ' ' + (el.getAttribute('class') || '')).trim());
            el.replaceWith(svg);
        });
    }
    _runLucide();
    window._gdbLucide = _runLucide;
}());

// --- PROPAGAÇÃO DE UTMs PARA O CHECKOUT ---
(function () {
    var utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    var pageParams = new URLSearchParams(window.location.search);
    var utmQuery = new URLSearchParams();

    utmKeys.forEach(function (key) {
        var val = pageParams.get(key);
        if (val) utmQuery.set(key, val);
    });

    if (!utmQuery.toString()) return;

    document.querySelectorAll('a[href*="checkout.auvp.com.br/pay/"]').forEach(function (link) {
        var url = new URL(link.href);
        utmQuery.forEach(function (value, key) {
            url.searchParams.set(key, value);
        });
        link.href = url.toString();
    });
}());

// Dismiss da tela de carregamento após window.load + tempo mínimo
(function () {
    var loader = document.getElementById('gdb-loader');
    if (!loader) return; // Sem loader (ex.: widget Elementor sem a tela)
    var MIN_MS = 2000;
    var t0 = window._gdLoaderStart || Date.now();
    function dismiss() {
        var wait = Math.max(0, MIN_MS - (Date.now() - t0));
        setTimeout(function () {
            loader.classList.add('gld-hidden');
            setTimeout(function () {
                if (loader.parentNode) loader.parentNode.removeChild(loader);
            }, 900);
        }, wait);
    }
    if (document.readyState === 'complete') { dismiss(); }
    else { window.addEventListener('load', dismiss, { once: true }); }
}());

// --- TOGGLE ALUNO/NÃO-ALUNO NO FORMULÁRIO ---
function setAluno(val) {
    document.getElementById('aluno-value').value = val;
    const btnSim = document.getElementById('toggle-sim');
    const btnNao = document.getElementById('toggle-nao');
    if (val === 'Sim') {
        btnSim.classList.add('bg-red-600', 'text-white');
        btnSim.classList.remove('text-zinc-500');
        btnNao.classList.remove('bg-zinc-700', 'text-white');
        btnNao.classList.add('text-zinc-500');
    } else {
        btnNao.classList.add('bg-zinc-700', 'text-white');
        btnNao.classList.remove('text-zinc-500');
        btnSim.classList.remove('bg-red-600', 'text-white');
        btnSim.classList.add('text-zinc-500');
    }
}

// --- SCROLL SPY PARA MENU LATERAL FLUTUANTE E TOP NAV ---
const sections = document.querySelectorAll("section[id]");
const navItems = document.querySelectorAll(".floating-nav-item");
const topNavItems = document.querySelectorAll(".top-nav-item");
const floatingMenu = document.getElementById("floating-menu");
const heroVideo = document.getElementById('hero-video');

// Agrupa os eventos de scroll em 1 execução por quadro (o handler lê offsetTop de todas as seções)
let scrollTicking = false;
window.addEventListener("scroll", () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => { scrollTicking = false; updateOnScroll(); });
}, { passive: true });

function updateOnScroll() {
    let current = "hero";
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (window.scrollY >= sectionTop - 250) {
            current = section.getAttribute("id");
        }
    });

    if (current === "hero" || window.scrollY < window.innerHeight * 0.5) {
        floatingMenu.classList.add("opacity-0", "pointer-events-none", "-translate-y-[45%]");
        floatingMenu.classList.remove("opacity-100", "pointer-events-auto", "-translate-y-1/2");
    } else {
        floatingMenu.classList.remove("opacity-0", "pointer-events-none", "-translate-y-[45%]");
        floatingMenu.classList.add("opacity-100", "pointer-events-auto", "-translate-y-1/2");
    }

    const roteiroSection = document.getElementById('roteiro');
    if (window.scrollY >= (roteiroSection.offsetTop - 300)) {
        if (!heroVideo.paused) heroVideo.pause();
    } else if (heroVideo.paused) {
        heroVideo.play().catch(e => console.log(e));
    }

    navItems.forEach(item => {
        item.classList.remove("text-red-600");
        item.classList.add("text-zinc-400");
        item.querySelector('span').classList.remove("w-4", "bg-red-600");
        item.querySelector('span').classList.add("w-0", "bg-zinc-400");

        if (item.getAttribute("href") === `#${current}`) {
            item.classList.remove("text-zinc-400");
            item.classList.add("text-red-600");
            item.querySelector('span').classList.remove("w-0", "bg-zinc-400");
            item.querySelector('span').classList.add("w-4", "bg-red-600");
        }
    });

    topNavItems.forEach(item => {
        item.classList.remove("text-red-500", "underline");
        if (item.getAttribute("href") === `#${current}`) {
            item.classList.add("text-red-500", "underline");
        }
    });
}

// --- FAQ — toggle independente por item ---
function toggleFaq(btn) {
    btn.closest('.faq-item').classList.toggle('faq-open');
}

// --- NOVA LÓGICA DO ACORDEÃO (Atualizada para animação de CSS Nativo / is-open) ---
function toggleAccordion(btn) {
    const item = btn.closest('.accordion-item');
    const isOpen = item.classList.contains('is-open');
    const isFaq = item.closest('#faq') !== null;

    if (isFaq) {
        // FAQ: cada item abre e fecha de forma independente
        item.classList.toggle('is-open');
    } else {
        // Edições: fecha todos os outros, abre só o clicado
        document.querySelectorAll('#edicoes .accordion-item').forEach(el => {
            el.classList.remove('is-open', 'z-50');
            el.classList.add('z-10');
        });
        if (!isOpen) {
            item.classList.add('is-open', 'z-50');
            item.classList.remove('z-10');
        }
    }
}

// --- INTERSECTION OBSERVER ---
const observerOptions = {
    root: null,
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.1
};

const scrollObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target); 
        }
    });
}, observerOptions);

// Observer Exclusivo para as Polaroids (animam apenas quando entram na tela)
const polaroidObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-pop-in');
            observer.unobserve(entry.target);
        }
    });
}, { rootMargin: '0px 0px -5% 0px', threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => {
    if (!el.closest('#hero')) {
        scrollObserver.observe(el);
    }
});

// Ativa hero e habilita reveals no mesmo tick de renderização:
// 1. .active adicionado antes de js-loaded → hero visível imediatamente
// 2. js-loaded habilita opacity:0 nos demais (abaixo da dobra, fora da tela)
document.querySelectorAll('#hero .reveal').forEach(function(el) { el.classList.add('active'); });
document.getElementById('gdb-root').classList.add('js-loaded');

// --- GALERIA DE FOTOS (MURAL ESPALHADO - IMAGENS OFICIAIS) ---
const galleryPhotos = [
    { id: 1, city: 'Goiânia', label: 'Goiânia', state: 'GO', src: 'https://github.com/ProdutosAUVP/gdb-itinerante/raw/main/Goi%C3%A2nia/IMG-20251106-WA0347.jpg.2e9a610eb8b47d988309ff166fead2ec.jpg', rot: '-12deg', mt: 'mt-2 md:mt-0' },
    { id: 2, city: 'Belo Horizonte', label: 'Belo Horizonte', state: 'MG', src: 'https://github.com/ProdutosAUVP/gdb-itinerante/raw/main/bh%20redux%201.webp', rot: '5deg', mt: 'mt-8 md:mt-16' },
    { id: 3, city: 'Goiânia', label: 'Goiânia', state: 'GO', src: 'https://github.com/ProdutosAUVP/gdb-itinerante/raw/main/Goi%C3%A2nia/IMG_0793.JPG', rot: '-4deg', isHighlight: true, mt: '-mt-4 md:-mt-10' },
    { id: 4, city: 'Belo Horizonte', label: 'Belo Horizonte', state: 'MG', src: 'https://github.com/ProdutosAUVP/gdb-itinerante/raw/main/bh%20redux%202.webp', rot: '15deg', mt: 'mt-6 md:mt-12' },
    { id: 5, city: 'Goiânia', label: 'Goiânia', state: 'GO', src: 'https://github.com/ProdutosAUVP/gdb-itinerante/raw/main/Goi%C3%A2nia/IMG_0796.jpg', rot: '8deg', mt: '-mt-2 md:-mt-6' },
    { id: 6, city: 'Belo Horizonte', label: 'Belo Horizonte', state: 'MG', src: 'https://github.com/ProdutosAUVP/gdb-itinerante/raw/main/bh%20redux%203.webp', rot: '-10deg', mt: 'mt-4 md:mt-8' },
    { id: 7, city: 'Goiânia', label: 'Goiânia', state: 'GO', src: 'https://github.com/ProdutosAUVP/gdb-itinerante/raw/main/Goi%C3%A2nia/ImagemdoWhatsAppde2025-07-26s10_48.30_59f20d19.jpg.aab9f398a9048f0538f5208dedd29f4d.jpg.97eec.jpg', rot: '10deg', mt: '-mt-4 md:-mt-8' },
    { id: 8, city: 'Belo Horizonte', label: 'Belo Horizonte', state: 'MG', src: 'https://github.com/ProdutosAUVP/gdb-itinerante/raw/main/bh%20redux%204.webp', rot: '-7deg', mt: 'mt-2 md:mt-4' },
    { id: 9, city: 'São Paulo', label: 'São Paulo', state: 'SP', src: '/wp-content/uploads/2026/07/DSC01389-scaled.jpg', rot: '-9deg', mt: 'mt-4 md:mt-10' },
    { id: 10, city: 'São Paulo', label: 'São Paulo', state: 'SP', src: '/wp-content/uploads/2026/07/DSC01181-scaled.jpg', rot: '6deg', mt: '-mt-2 md:-mt-8' },
    { id: 11, city: 'São Paulo', label: 'São Paulo', state: 'SP', src: '/wp-content/uploads/2026/07/DSC01208-scaled.jpg', rot: '-6deg', isHighlight: true, mt: 'mt-6 md:mt-12' },
    { id: 12, city: 'São Paulo', label: 'São Paulo', state: 'SP', src: '/wp-content/uploads/2026/07/DSC01355-scaled.jpg', rot: '11deg', mt: '-mt-4 md:-mt-10' },
    { id: 13, city: 'São Paulo', label: 'São Paulo', state: 'SP', src: '/wp-content/uploads/2026/07/DSC01395-scaled.jpg', rot: '-13deg', mt: 'mt-2 md:mt-6' },
    { id: 14, city: 'São Paulo', label: 'São Paulo', state: 'SP', src: '/wp-content/uploads/2026/07/DSC01251-scaled.jpg', rot: '9deg', mt: '-mt-2 md:-mt-4' },
    { id: 15, city: 'Florianópolis', label: 'Florianópolis', state: 'SC', src: 'https://cdn.asupernova.com.br/giro%20da%20bolsa%20itinerante/DSC03356.jpg', rot: '-11deg', mt: 'mt-4 md:mt-10' },
    { id: 16, city: 'Florianópolis', label: 'Florianópolis', state: 'SC', src: 'https://cdn.asupernova.com.br/giro%20da%20bolsa%20itinerante/DSC03439.jpg', rot: '7deg', mt: '-mt-2 md:-mt-6' },
    { id: 17, city: 'Florianópolis', label: 'Florianópolis', state: 'SC', src: 'https://cdn.asupernova.com.br/giro%20da%20bolsa%20itinerante/DSC03937.jpg', rot: '-5deg', isHighlight: true, mt: 'mt-6 md:mt-12' },
    { id: 18, city: 'Florianópolis', label: 'Florianópolis', state: 'SC', src: 'https://cdn.asupernova.com.br/giro%20da%20bolsa%20itinerante/DSC03978.jpg', rot: '12deg', mt: '-mt-4 md:-mt-10' },
    { id: 19, city: 'Florianópolis', label: 'Florianópolis', state: 'SC', src: 'https://cdn.asupernova.com.br/giro%20da%20bolsa%20itinerante/DSC03671.jpg', rot: '-8deg', mt: 'mt-2 md:mt-6' },
];

const filterOptions = ['Todos', 'Goiânia', 'Belo Horizonte', 'São Paulo', 'Florianópolis'];
let activeFilter = 'Todos';

const filterContainer = document.getElementById('filter-container');
const galleryContainer = document.getElementById('gallery-container');

// Miniatura para a grade: fotos locais têm versão WebP de 800px (scripts/gerar-miniaturas.mjs).
// Fotos externas seguem com a URL original. O lightbox continua abrindo photo.src (tamanho cheio).
function thumbSrc(src) {
    return /^\/wp-content\/uploads\/.+-scaled\.jpg$/.test(src) ? src.replace(/\.jpg$/, '-800.webp') : src;
}

// A montagem das fileiras só muda ao cruzar o breakpoint md (768px); outros resizes
// (ex.: barra de endereço do celular ao rolar) não precisam refazer o mural.
let resizeTimeoutGallery;
let galleryWasMobile = window.innerWidth < 768;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeoutGallery);
    resizeTimeoutGallery = setTimeout(() => {
        const isMobile = window.innerWidth < 768;
        if (isMobile !== galleryWasMobile) renderGallery();
    }, 200);
});

function renderGallery() {
    galleryContainer.innerHTML = '';
    const filtered = galleryPhotos.filter(p => activeFilter === 'Todos' || p.city === activeFilter);
    
    let rows = [];
    const isMobile = window.innerWidth < 768; // Tailwind breakpoint para md
    galleryWasMobile = isMobile;
    
    if (isMobile) {
        // No mobile, força agrupamento de no máximo 3 fotos por fileira
        const chunkSize = 3;
        for (let i = 0; i < filtered.length; i += chunkSize) {
            rows.push(filtered.slice(i, i + chunkSize));
        }
    } else if (filtered.length > 14) {
        // Com o acervo das quatro edições, metade por fileira estreitaria demais
        // cada polaroid: acima de 14 fotos o mural passa a usar três fileiras.
        const perRow = Math.ceil(filtered.length / 3);
        for (let i = 0; i < filtered.length; i += perRow) {
            rows.push(filtered.slice(i, i + perRow));
        }
    } else {
        // No desktop divide pela metade normalmente
        if (filtered.length > 4) {
            const mid = Math.ceil(filtered.length / 2);
            rows.push(filtered.slice(0, mid));
            rows.push(filtered.slice(mid));
        } else {
            rows.push(filtered);
        }
    }
    
    let globalIndex = 0;
    
    rows.forEach((row, rowIndex) => {
        const rowContainer = document.createElement('div');
        rowContainer.className = `flex justify-center items-center w-full ${rowIndex > 0 ? '-mt-4 sm:-mt-8 md:-mt-16' : ''}`;
        
        row.forEach((photo, index) => {
            const marginClass = index === 0 ? '' : '-mx-3 sm:-mx-4 md:-mx-8 lg:-mx-10';
            const zIndex = photo.isHighlight ? 'z-40 scale-105' : `z-[${index + 10}]`;
            const textClasses = photo.isHighlight ? 'text-lg' : '';
            const edClasses = 'text-zinc-500';
            const staggerDelay = globalIndex * 100;
            globalIndex++;

            // Ajustes aplicados na largura (w-28 min-[400px]:w-36) e altura (h-32 min-[400px]:h-36) das fotos para não estourar a tela no mobile
            rowContainer.innerHTML += `
                <div class="polaroid-card relative bg-white p-2 md:p-3 pb-10 md:pb-12 shadow-2xl border border-zinc-200 w-28 min-[400px]:w-36 sm:w-44 md:w-60 ${marginClass} ${photo.mt} ${zIndex} cursor-pointer group/photo" 
                     style="--card-rot: ${photo.rot}; opacity: 0; animation-delay: ${staggerDelay}ms;" onclick="openLightbox('${photo.src}', '${photo.label}', '${photo.state}')">
                    <div class="relative overflow-hidden w-full h-32 min-[400px]:h-36 sm:h-40 md:h-56">
                        <img loading="lazy" decoding="async" src="${thumbSrc(photo.src)}" alt="${photo.city}" class="w-full h-full object-cover transition-transform duration-700 group-hover/photo:scale-110" />
                        <div class="absolute inset-0 bg-black/10 opacity-0 group-hover/photo:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        </div>
                    </div>
                    <div class="absolute bottom-2 md:bottom-3 left-3 md:left-4 right-3 md:right-4 flex justify-between items-center font-serif text-zinc-800">
                        <span class="font-bold text-[10px] min-[400px]:text-xs sm:text-sm md:text-base ${textClasses}">${photo.label}</span>
                        <span class="text-[9px] min-[400px]:text-[10px] sm:text-xs md:text-sm ${edClasses}">${photo.state}</span>
                    </div>
                </div>
            `;
        });
        
        galleryContainer.appendChild(rowContainer);
    });
    
    if (window._gdbLucide) window._gdbLucide();

    setTimeout(() => {
        document.querySelectorAll('.polaroid-card').forEach(card => {
            polaroidObserver.observe(card);
        });
    }, 50);
}

function renderFilters() {
    filterContainer.innerHTML = '';
    filterOptions.forEach(option => {
        const btn = document.createElement('button');
        const isActive = activeFilter === option;
        
        btn.className = `px-5 py-2 rounded-full text-xs md:text-sm font-semibold tracking-wider uppercase transition-all duration-300 ${
            isActive 
            ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 transform scale-105' 
            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700'
        }`;
        btn.innerText = option;
        
        btn.onclick = () => {
            activeFilter = option;
            renderFilters(); 
            renderGallery(); 
        };
        
        filterContainer.appendChild(btn);
    });
}

renderFilters();
renderGallery();

// --- SISTEMA DE MODAIS ---
function openCityModal() {
    const modal = document.getElementById('city-modal');
    const content = document.getElementById('city-modal-content');
    modal.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => {
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
    }, 10);
}

function closeCityModal() {
    const modal = document.getElementById('city-modal');
    const content = document.getElementById('city-modal-content');
    content.classList.remove('scale-100');
    content.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('opacity-0', 'pointer-events-none');
    }, 300);
}

function openLightbox(src, city, state) {
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    const caption = document.getElementById('lightbox-caption');
    const cityEl = document.getElementById('lightbox-city');
    const stateEl = document.getElementById('lightbox-state');
    
    img.src = src;
    cityEl.innerText = city;
    stateEl.innerText = state;
    
    modal.classList.remove('opacity-0', 'pointer-events-none');
    setTimeout(() => {
        img.classList.remove('scale-95');
        img.classList.add('scale-100');
        if(caption) {
            caption.classList.remove('scale-95');
            caption.classList.add('scale-100');
        }
    }, 10);
}

function closeLightbox() {
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    const caption = document.getElementById('lightbox-caption');
    
    img.classList.remove('scale-100');
    img.classList.add('scale-95');
    if(caption) {
        caption.classList.remove('scale-100');
        caption.classList.add('scale-95');
    }
    
    setTimeout(() => {
        modal.classList.add('opacity-0', 'pointer-events-none');
    }, 300);
}

// --- MAPA DINÂMICO (D3.JS) ---
// D3 (~90 KB) e o GeoJSON dos estados (~730 KB) só são baixados quando a seção do mapa
// se aproxima da tela; até lá fica o loader "Sincronizando satélites...".
function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (window.d3) return resolve();
        const s = document.createElement('script');
        s.src = src; s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
    });
}

const mapObserver = new IntersectionObserver((entries, observer) => {
    if (!entries.some(e => e.isIntersecting)) return;
    observer.disconnect();
    drawMap();
}, { rootMargin: '800px 0px' });
mapObserver.observe(document.getElementById('map-container'));

function drawMap() {
Promise.all([
    loadScript('https://d3js.org/d3.v7.min.js'),
    fetch('https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson').then(res => res.json())
])
    .then(([, geoData]) => geoData)
    .then(geoData => {
        const mapContainer = document.getElementById('map-container');
        mapContainer.innerHTML = ''; 
        
        const width = 800;
        const height = 800;
        
        const projection = d3.geoMercator().fitSize([width, height], geoData);
        const pathGenerator = d3.geoPath().projection(projection);

        // Coordenadas das cidades
        const pts = {
            goiania: projection([-49.2648, -16.6869]),
            bh: projection([-43.9387, -19.9227]),
            sp: projection([-46.6333, -23.5505]),
            // Coordenadas alteradas para o centro geográfico do Paraná
            florianopolis: projection([-48.5495, -27.5969]),
            rio: projection([-43.1729, -22.9068])
        };

        let statesPathHTML = '';
        geoData.features.forEach(feature => {
            statesPathHTML += `<path d="${pathGenerator(feature)}" class="fill-zinc-200 dark:fill-zinc-800 stroke-white dark:stroke-zinc-700 stroke-[1.5px]"></path>`;
        });

        const svgHTML = `
            <svg class="w-full h-auto drop-shadow-2xl overflow-visible pointer-events-none transform scale-110 md:scale-[1.20] origin-center md:origin-right" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <filter id="text-shadow">
                        <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.8" flood-color="#000" />
                    </filter>
                </defs>
                <g class="brazil-states">${statesPathHTML}</g>
                
                <!-- Linhas da rota já percorrida -->
                <path d="M ${pts.goiania[0]} ${pts.goiania[1]} L ${pts.bh[0]} ${pts.bh[1]}" fill="none" stroke="#dc2626" stroke-width="3"></path>
                <path d="M ${pts.bh[0]} ${pts.bh[1]} L ${pts.sp[0]} ${pts.sp[1]}" fill="none" stroke="#dc2626" stroke-width="3"></path>
                <path d="M ${pts.sp[0]} ${pts.sp[1]} L ${pts.florianopolis[0]} ${pts.florianopolis[1]}" fill="none" stroke="#dc2626" stroke-width="3"></path>
                <!-- Linha tracejada para a próxima parada -->
                <path d="M ${pts.florianopolis[0]} ${pts.florianopolis[1]} L ${pts.rio[0]} ${pts.rio[1]}" fill="none" stroke="#dc2626" stroke-width="3.5" class="dash-anim" opacity="0.9"></path>

                <!-- Cidades da Rota Já Percorrida -->
                <g transform="translate(${pts.goiania[0]}, ${pts.goiania[1]})">
                    <circle r="5" fill="#dc2626" />
                    <text x="-18" y="-8" class="fill-zinc-900 dark:fill-white text-lg font-bold" text-anchor="end" filter="url(#text-shadow)">Goiânia, GO</text>
                    <text x="-18" y="10" class="fill-zinc-500 text-sm" text-anchor="end" filter="url(#text-shadow)">Ponto de Partida</text>
                </g>
                <g transform="translate(${pts.bh[0]}, ${pts.bh[1]})">
                    <circle r="5" fill="#dc2626" />
                    <text x="18" y="-8" class="fill-zinc-900 dark:fill-white text-lg font-bold" text-anchor="start" filter="url(#text-shadow)">Belo Horizonte, MG</text>
                    <text x="18" y="10" class="fill-zinc-500 text-sm" text-anchor="start" filter="url(#text-shadow)">Realizado</text>
                </g>
                <g transform="translate(${pts.sp[0]}, ${pts.sp[1]})">
                    <circle r="5" fill="#dc2626" />
                    <text x="-18" y="-8" class="fill-zinc-900 dark:fill-white text-lg font-bold" text-anchor="end" filter="url(#text-shadow)">São Paulo, SP</text>
                    <text x="-18" y="10" class="fill-zinc-500 text-sm" text-anchor="end" filter="url(#text-shadow)">Realizado</text>
                </g>

                <g transform="translate(${pts.florianopolis[0]}, ${pts.florianopolis[1]})">
                    <circle r="5" fill="#dc2626" />
                    <text x="0" y="28" class="fill-zinc-900 dark:fill-white text-lg font-bold" text-anchor="middle" filter="url(#text-shadow)">Florianópolis, SC</text>
                    <text x="0" y="46" class="fill-zinc-500 text-sm" text-anchor="middle" filter="url(#text-shadow)">Realizado</text>
                </g>

                <!-- Próximo Destino -->
                <g transform="translate(${pts.rio[0]}, ${pts.rio[1]})">
                    <circle r="8" class="fill-white dark:fill-zinc-900" stroke="#dc2626" stroke-width="3" />
                    <circle r="16" fill="#dc2626" opacity="0.2" class="animate-ping" />
                    <text x="0" y="48" class="fill-zinc-900 dark:fill-white text-xl font-bold" text-anchor="middle" filter="url(#text-shadow)">Rio de Janeiro, RJ</text>
                    <text x="0" y="70" fill="#dc2626" class="text-[13px] font-bold uppercase tracking-widest" text-anchor="middle" filter="url(#text-shadow)">Próximo Destino</text>
                </g>
            </svg>
        `;
        mapContainer.innerHTML = svgHTML;
    })
    .catch(err => console.error("Erro ao desenhar o mapa:", err));
}

// --- INTEGRAÇÃO FORMULÁRIO GOOGLE SHEETS ---
const form = document.getElementById('city-suggestion-form');
const submitBtn = document.getElementById('submit-btn');

// IMPORTANTE: Cole aqui a URL gerada no Passo 5 do tutorial
const scriptURL = 'https://script.google.com/macros/s/AKfycbxDyjPr_QnhAreRrrTC8yNTc86Lv6WE4mogyOqdteqDwPeWUMFWcsYUU9-hXvdwB9cTlQ/exec';

form.addEventListener('submit', e => {
    e.preventDefault(); // Evita que a página recarregue
    

    // Estado de "Carregando"
    const originalText = submitBtn.innerText;
    submitBtn.innerText = 'Enviando...';
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-70', 'cursor-not-allowed');

    // Envia como URL-encoded para que o Apps Script leia e.parameter corretamente
    fetch(scriptURL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString()
    })
        .then(() => {
            alert('Sua sugestão foi enviada com sucesso! Obrigado.');
            form.reset();
            closeCityModal();
        })
        .catch(error => {
            console.error('Erro!', error.message);
            alert('Houve um erro ao enviar. Tente novamente mais tarde.');
        })
        .finally(() => {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
        });
});

// --- VÍDEOS DAS EDIÇÕES: facade do YouTube ---
// Mostra só a thumbnail + botão de play; o iframe (youtube-nocookie, autoplay) é criado no clique.
// É um <button>, então Enter/Espaço também ativam.
document.querySelectorAll('.yt-facade').forEach(btn => {
    btn.addEventListener('click', () => {
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube-nocookie.com/embed/${btn.dataset.yt}?autoplay=1`;
        iframe.title = btn.dataset.title;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        btn.replaceWith(iframe);
        iframe.focus();
    });
});

// --- ANIMAÇÕES CONTÍNUAS FORA DA TELA ---
// Faixa "EM BREVE" (tapeScroll + backdrop-blur), rota tracejada, ping e pulses ficam pausados
// enquanto a seção não está visível (classe .anim-paused, ver style.css).
const animObserver = new IntersectionObserver(entries => {
    entries.forEach(e => e.target.classList.toggle('anim-paused', !e.isIntersecting));
}, { rootMargin: '100px 0px' });
document.querySelectorAll('#gdb-root section').forEach(s => animObserver.observe(s));

// Handlers usados em atributos onclick (HTML estático e polaroids geradas no JS).
Object.assign(window, { setAluno, toggleFaq, toggleAccordion, openCityModal, closeCityModal, openLightbox, closeLightbox })
