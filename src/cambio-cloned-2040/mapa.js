// Hero com mapa-múndi animado (D3 + TopoJSON via CDN), portado do widget HTML do Elementor.
// Rotas pontilhadas saem de Goiânia (AUVP Capital) para as praças das moedas e ficam animando em loop.
/* global d3, topojson */

;(async function () {
  const root = document.getElementById('heroMapRoot')
  if (!root || !window.d3 || !window.topojson) return
  const desiredH = root.dataset.heroH || '100vh'
  function ensureHeight() {
    const h = root.getBoundingClientRect().height
    if (h < 400) root.style.setProperty('--hero-h', desiredH)
  }
  ensureHeight()
  window.addEventListener('resize', ensureHeight)

  const el = document.getElementById('heroMap')
  const svg = d3.select(el).append('svg')
  const defs = svg.append('defs')
  const tip = d3.select(el).append('div').attr('class', 'tx-tip')

  const yGlow = defs.append('filter').attr('id', 'yGlow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
  yGlow.append('feGaussianBlur').attr('stdDeviation', 1.2).attr('result', 'blur')
  yGlow.append('feMerge').html('<feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/>')
  const yGlowStrong = defs.append('filter').attr('id', 'yGlowStrong').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
  yGlowStrong.append('feGaussianBlur').attr('stdDeviation', 2.4).attr('result', 'sblur')
  yGlowStrong.append('feMerge').html('<feMergeNode in="sblur"/><feMergeNode in="SourceGraphic"/>')
  const radial = defs.append('radialGradient').attr('id', 'halo').attr('cx', '50%').attr('cy', '50%')
  radial.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(255, 215, 64, .20)')
  radial.append('stop').attr('offset', '70%').attr('stop-color', 'rgba(255, 215, 64, .05)')
  radial.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(255, 215, 64, 0)')

  const gBack = svg.append('g')
  const gMap = svg.append('g')
  const gRoutes = svg.append('g')
  const gPts = svg.append('g')

  const world = await fetch('https://unpkg.com/world-atlas@2.0.2/countries-110m.json').then((r) => r.json())
  const land = topojson.feature(world, world.objects.countries)
  const mesh = topojson.mesh(world, world.objects.countries, (a, b) => a !== b)
  const graticule = d3.geoGraticule()
  const origin = [-49.2648, -16.6869]
  const currencies = [
    { code: 'USD', coord: [-74.006, 40.7128] },
    { code: 'EUR', coord: [8.6821, 50.1109] },
    { code: 'GBP', coord: [-0.1278, 51.5074] },
    { code: 'CHF', coord: [8.5417, 47.3769] },
    { code: 'JPY', coord: [139.6917, 35.6895] },
    { code: 'CNY', coord: [121.4737, 31.2304] },
    { code: 'AUD', coord: [151.2093, -33.8688] },
    { code: 'NZD', coord: [174.7633, -36.8485] },
    { code: 'CAD', coord: [-79.3832, 43.6532] },
    { code: 'SGD', coord: [103.8198, 1.3521] },
    { code: 'HKD', coord: [114.1095, 22.3964] },
    { code: 'CZK', coord: [14.4378, 50.0755] },
    { code: 'MXN', coord: [-99.1332, 19.4326] },
    { code: 'TRY', coord: [28.9784, 41.0082] },
    { code: 'ZAR', coord: [28.0473, -26.2041] },
  ]
  const yellows = ['#FFF9C4', '#FFF59D', '#FFF176', '#FFEE58', '#FFEB3B', '#FFD54F', '#FFC107', '#FDD835', '#FBC02D', '#F9A825']

  const ro = new ResizeObserver(() => render())
  ro.observe(root)

  function render() {
    const rect = root.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    svg.attr('viewBox', `0 0 ${width} ${height}`)
    const projection = d3.geoMercator().center([40, -10]).translate([width / 2, height / 2]).scale((width / (2 * Math.PI)) * 0.95)
    const path = d3.geoPath(projection)
    gBack.selectAll('*').remove()
    gMap.selectAll('*').remove()
    gRoutes.selectAll('*').remove()
    gPts.selectAll('*').remove()

    const [ox, oy] = projection(origin)
    gBack.append('circle').attr('cx', ox).attr('cy', oy).attr('r', Math.min(width, height) * 0.35).attr('fill', 'url(#halo)')
    gMap.append('path').datum(graticule()).attr('class', 'graticule').attr('d', path)
    gMap.append('path').datum(land).attr('class', 'land').attr('d', path)
    gMap.append('path').datum(mesh).attr('class', 'borders').attr('d', path)

    // Cresce o trecho visível da rota e depois "recolhe" a cauda, então agenda a próxima ida/volta.
    function growThenTail(maskPath, L) {
      const growDur = 5000 + Math.random() * 3000
      const tailDur = 4000 + Math.random() * 3000
      maskPath
        .attr('stroke-dasharray', `0 ${L}`)
        .attr('stroke-dashoffset', 0)
        .transition()
        .duration(growDur)
        .ease(d3.easeLinear)
        .tween('grow', () => (t) => {
          const vis = t * L
          maskPath.attr('stroke-dasharray', `${vis} ${L - vis}`).attr('stroke-dashoffset', 0)
        })
        .on('end', function tail() {
          d3.select(this)
            .transition()
            .duration(tailDur)
            .ease(d3.easeLinear)
            .tween('tail', () => (t) => {
              const vis = (1 - t) * L
              maskPath.attr('stroke-dasharray', `${vis} ${L - vis}`).attr('stroke-dashoffset', -(L - vis))
            })
            .on('end', () => scheduleNext(maskPath))
        })
    }

    function scheduleNext(maskPath) {
      const data = maskPath.datum()
      const dir = Math.random() < 0.5 ? 'out' : 'in'
      const dStr = dir === 'out' ? data.fwdD : data.revD
      maskPath.attr('d', dStr).attr('data-dir', dir)
      const L = maskPath.node().getTotalLength()
      const delay = 400 + Math.random() * 1600
      setTimeout(() => growThenTail(maskPath, L), delay)
    }

    const tipBlockRadius = 16
    currencies.forEach((d, i) => {
      const interp = d3.geoInterpolate([origin[0], origin[1]], [d.coord[0], d.coord[1]])
      const samplesFwd = d3.range(0, 1.0001, 1 / 64).map((t) => interp(t))
      const samplesRev = samplesFwd.slice().reverse()
      const fwdD = path({ type: 'LineString', coordinates: samplesFwd })
      const revD = path({ type: 'LineString', coordinates: samplesRev })
      const color = yellows[i % yellows.length]
      const dots = gRoutes.append('path').attr('class', 'route-dots').attr('d', fwdD).attr('stroke', color).style('opacity', 0.88)
      const mid = `mask-${i}-${Date.now()}`
      const m = defs.append('mask').attr('id', mid)
      const maskPath = m.append('path').datum({ fwdD, revD }).attr('class', 'mask-stroke').attr('d', fwdD).attr('data-dir', 'out')
      dots.attr('mask', `url(#${mid})`)

      const hit = gRoutes.append('path').attr('class', 'route-hit').attr('d', fwdD)
      hit
        .on('mouseenter', () => tip.style('opacity', 1))
        .on('mousemove', (event) => {
          const dir = maskPath.attr('data-dir') || 'out'
          const txt = dir === 'out' ? `BRL > ${d.code}` : `${d.code} > BRL`
          const rect = el.getBoundingClientRect()
          const ex = event.clientX - rect.left
          const ey = event.clientY - rect.top
          const arriveXY = dir === 'out' ? projection(d.coord) : [ox, oy]
          const dist = Math.hypot(ex - arriveXY[0], ey - arriveXY[1])
          if (dist <= tipBlockRadius) {
            tip.style('opacity', 0)
            return
          }
          tip.text(txt).style('left', ex + 14 + 'px').style('top', ey - 8 + 'px').style('opacity', 1)
        })
        .on('mouseleave', () => tip.style('opacity', 0))
      scheduleNext(maskPath)
    })

    gPts.append('circle').attr('class', 'node').attr('cx', ox).attr('cy', oy).attr('r', 4.5)
    gPts.append('text').attr('class', 'label').attr('x', ox + 8).attr('y', oy - 6).text('AUVP Capital')
    currencies.forEach((d) => {
      const [x, y] = projection(d.coord)
      gPts.append('circle').attr('class', 'node').attr('cx', x).attr('cy', y).attr('r', 3.2)
      gPts.append('text').attr('class', 'label').attr('x', x + 6).attr('y', y - 6).text(`${d.code}`)
    })
  }

  render()
})()
