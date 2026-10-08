// Tailwind compilado da calculadora de câmbio, compartilhado por /cambio/ e /cambio-cloned-2040/.
// O content inclui calculadora.js porque ele adiciona classes por JS (skeleton, erro, estados de envio).
export default {
  content: {
    relative: true,
    files: [
      './index.html',
      './calculadora.js',
      '../_partials/calculadora-cambio.html',
      '../cambio-cloned-2040/index.html',
      '../cambio-cloned-2040/*.js',
    ],
  },
  // Sem preflight para não resetar o resto da página (o reset da calculadora fica em calculadora.css).
  corePlugins: { preflight: false },
}
