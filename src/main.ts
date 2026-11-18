import './style.css';
import { App } from './app';
import { Interface } from './ui/interface';
import { lerLink } from './ui/url';
import { tempo, eras } from './core/data';
import { montarListaLugares } from './ui/lugares';

function iniciar() {
  const host = document.getElementById('mapa')!;
  const raiz = document.getElementById('app')!;
  const aa = eras.find((e) => e.id === 'AA')!;
  const inicio = tempo.cursor(aa.cursor_padrao!);
  const link = lerLink();
  let app: App;
  try {
    app = new App(host);
  } catch (e) {
    console.error('Não foi possível iniciar o mapa 3D.', e);
    raiz.innerHTML = `<main class="erro-webgl"><h1>Atlas de Arda</h1><p role="alert">Não foi possível iniciar o mapa 3D. Você pode consultar os lugares abaixo.</p>
      <button type="button" id="tentar-novamente">Tentar novamente</button>
      <h2>Lugares por era</h2><div class="lugares-lista"></div></main>`;
    document.getElementById('tentar-novamente')!.addEventListener('click', () => location.reload());
    montarListaLugares(raiz.querySelector('.lugares-lista')!, link.t ?? link.comparar?.[0] ?? inicio);
    return;
  }
  const ui = new Interface(app, raiz);
  // abertura: Aman, Anos das Árvores, Tol Eressëa em primeiro plano e as Pelóri ao fundo
  app.definirTempo(inicio, { silencioso: true });
  app.camera.definir(aa.vista!);
  if (location.hash.length > 3) ui.aplicarLink(link);
  app.iniciar();
  (window as unknown as { arda: unknown }).arda = { app, ui, tempo };
}

iniciar();
