import './style.css';
import { App } from './app';
import { Interface } from './ui/interface';
import { lerLink } from './ui/url';
import { tempo, eras } from './core/data';

function iniciar() {
  const host = document.getElementById('mapa')!;
  const raiz = document.getElementById('app')!;
  let app: App;
  try {
    app = new App(host);
  } catch (e) {
    raiz.innerHTML = `<div class="erro-webgl"><h1>Atlas de Arda</h1><p>Não foi possível iniciar o mapa 3D. Verifique se o navegador tem WebGL ativado.</p><pre>${String(e)}</pre></div>`;
    return;
  }
  const ui = new Interface(app, raiz);
  // abertura: Aman, Anos das Árvores, Tol Eressëa em primeiro plano e as Pelóri ao fundo
  const aa = eras.find((e) => e.id === 'AA')!;
  app.definirTempo(tempo.cursor(aa.cursor_padrao!), { silencioso: true });
  app.camera.definir(aa.vista!);
  const link = lerLink();
  if (location.hash.length > 3) ui.aplicarLink(link);
  app.iniciar();
  (window as unknown as { arda: unknown }).arda = { app, ui, tempo };
}

iniciar();
