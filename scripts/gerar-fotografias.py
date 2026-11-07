#!/usr/bin/env python3
"""Fotografias dos lugares (docs/ROADMAP-FOTOGRAFIAS-LUGARES.md).

    python scripts/gerar-fotografias.py [gerar] [ids...]     # gera/retoma as variações pendentes
    python scripts/gerar-fotografias.py status               # variações e aprovação de cada foto
    python scripts/gerar-fotografias.py aprovar <id> <n> [--espelhar]   # vN.png -> public/fotografias/<id>.webp
    python scripts/gerar-fotografias.py refazer <id>         # descarta as variações e gera de novo

Opções: --etapa N (padrão 1), --variacoes N (padrão 3), --motor auto|comfy|gpt.

Motor, na ordem do projeto HopeGym:
  1. ComfyUI local, FLUX.2 klein, um worker por GPU (COMFY_URLS, padrão
     http://10.1.4.150:8188,http://10.1.4.150:8189; modelo em COMFY_MODEL: 9b | distilled | base).
  2. Se nenhum ComfyUI responder (ou com --motor gpt): API de imagens da OpenAI
     (OPENAI_API_KEY ou ../secret-gpt.txt, fora do repositório), uma variação por foto para conter o custo.

Estado = arquivos: fontes-imagens/<id>/vN.png e geracao.json (fora do git). O atlas publicado nunca
chama nenhuma API; só usa os WebP aprovados em public/fotografias/.
"""
import base64, json, os, random, re, shutil, sys, threading, time, urllib.error, urllib.parse, urllib.request, uuid
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FONTES = ROOT / 'fontes-imagens'
PUBLICO = ROOT / 'public' / 'fotografias'
CADASTRO = ROOT / 'data' / 'fotografias.json'

SERVIDORES = [u.strip().rstrip('/') for u in os.environ.get(
    'COMFY_URLS', 'http://10.1.4.150:8188,http://10.1.4.150:8189').split(',') if u.strip()]
QWEN_4B, QWEN_8B = 'qwen_3_4b.safetensors', 'qwen_3_8b_fp8mixed.safetensors'
MODELOS = {  # mesmos do HopeGym; 9b é FLUX Non-Commercial, os 4B são Apache 2.0
    '9b': {'unet': 'flux-2-klein-9b-fp8.safetensors', 'clip': QWEN_8B, 'steps': 4, 'cfg': 1.0},
    'distilled': {'unet': 'flux-2-klein-4b-fp8.safetensors', 'clip': QWEN_4B, 'steps': 4, 'cfg': 1.0},
    'base': {'unet': 'flux-2-klein-base-4b-fp8.safetensors', 'clip': QWEN_4B, 'steps': 20, 'cfg': 5.0},
}
NOME_MODELO = os.environ.get('COMFY_MODEL', '9b')
MODELO = MODELOS[NOME_MODELO]
NEGATIVO = 'text, letters, watermark, signature, logo, frame, modern buildings, power lines, cars, people in modern clothes, illustration, painting, cartoon'

GPT_CHAVE = ROOT.parent / 'secret-gpt.txt'
GPT_MODELO = os.environ.get('GPT_IMAGE_MODEL', 'gpt-image-2')
GPT_QUALIDADE = os.environ.get('GPT_IMAGE_QUALITY', 'medium')


# ---------- prompts ----------
def carregar(etapa):
    arq = ROOT / 'docs' / f'fotografias-etapa-{etapa}-prompts.json'
    dados = json.loads(arq.read_text(encoding='utf-8'))
    largura, altura = dados['tamanho']
    return {f['id']: {'prompt': f"{f['prompt']}\n\n{dados['estilo']}", 'tamanho': (largura, altura)} for f in dados['fotos']}


def pasta(foto_id):
    return FONTES / foto_id


def variacoes(foto_id):
    return sorted(pasta(foto_id).glob('v*.png'), key=lambda p: int(p.stem[1:]))


def registro(foto_id):
    arq = pasta(foto_id) / 'geracao.json'
    return json.loads(arq.read_text(encoding='utf-8')) if arq.exists() else []


_trava = threading.Lock()


def anotar(foto_id, item):
    with _trava:
        dados = registro(foto_id)
        dados.append(item)
        (pasta(foto_id) / 'geracao.json').write_text(json.dumps(dados, indent=2, ensure_ascii=False), encoding='utf-8')


def proximo_numero(foto_id):
    with _trava:  # reserva o arquivo para que dois workers não usem o mesmo número
        n = 1
        while (pasta(foto_id) / f'v{n}.png').exists() or (pasta(foto_id) / f'v{n}.reservado').exists():
            n += 1
        (pasta(foto_id) / f'v{n}.reservado').touch()
        return n


# ---------- ComfyUI ----------
def chamar(url, caminho, dados=None, cabecalhos=None, prazo=60):
    req = urllib.request.Request(url + caminho, data=dados, headers=cabecalhos or {})
    with urllib.request.urlopen(req, timeout=prazo) as r:
        return r.read()


def grafo(prompt, largura, altura, semente, prefixo):
    """FLUX.2 klein de texto para imagem (mesmos nós dos modelos oficiais do ComfyUI)."""
    return {
        'unet': {'class_type': 'UNETLoader', 'inputs': {'unet_name': MODELO['unet'], 'weight_dtype': 'default'}},
        'clip': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': MODELO['clip'], 'type': 'flux2'}},
        'vae': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'flux2-vae.safetensors'}},
        'pos': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['clip', 0]}},
        # com cfg 1 (destilado) o negativo não é usado; o modelo oficial zera o condicionamento
        'neg': {'class_type': 'CLIPTextEncode', 'inputs': {'text': NEGATIVO, 'clip': ['clip', 0]}}
        if MODELO['cfg'] > 1 else {'class_type': 'ConditioningZeroOut', 'inputs': {'conditioning': ['pos', 0]}},
        'sigmas': {'class_type': 'Flux2Scheduler', 'inputs': {'steps': MODELO['steps'], 'width': largura, 'height': altura}},
        'latent': {'class_type': 'EmptyFlux2LatentImage', 'inputs': {'width': largura, 'height': altura, 'batch_size': 1}},
        'noise': {'class_type': 'RandomNoise', 'inputs': {'noise_seed': semente}},
        'sampler': {'class_type': 'KSamplerSelect', 'inputs': {'sampler_name': 'euler'}},
        'guider': {'class_type': 'CFGGuider', 'inputs': {'model': ['unet', 0], 'positive': ['pos', 0], 'negative': ['neg', 0], 'cfg': MODELO['cfg']}},
        'sample': {'class_type': 'SamplerCustomAdvanced', 'inputs': {'noise': ['noise', 0], 'guider': ['guider', 0], 'sampler': ['sampler', 0], 'sigmas': ['sigmas', 0], 'latent_image': ['latent', 0]}},
        'decode': {'class_type': 'VAEDecode', 'inputs': {'samples': ['sample', 0], 'vae': ['vae', 0]}},
        'save': {'class_type': 'SaveImage', 'inputs': {'images': ['decode', 0], 'filename_prefix': prefixo}},
    }


def gerar_comfy(url, foto_id, foto, saida):
    semente = random.randrange(2**48)
    largura, altura = foto['tamanho']
    corpo = json.dumps({'prompt': grafo(foto['prompt'], largura, altura, semente, f'openarda/{foto_id}'), 'client_id': uuid.uuid4().hex}).encode()
    try:
        pid = json.loads(chamar(url, '/prompt', corpo, {'Content-Type': 'application/json'}))['prompt_id']
    except urllib.error.HTTPError as e:
        raise RuntimeError(f'ComfyUI recusou o fluxo: {e.read().decode()[:600]}') from None
    inicio = time.time()
    while True:
        item = json.loads(chamar(url, f'/history/{pid}')).get(pid)
        if item and item.get('status', {}).get('completed'):
            break
        if item and item.get('status', {}).get('status_str') == 'error':
            raise RuntimeError(f'ComfyUI falhou: {json.dumps(item["status"].get("messages"))[:600]}')
        if time.time() - inicio > 1800:
            raise RuntimeError('tempo esgotado')
        time.sleep(2)
    img = item['outputs']['save']['images'][0]
    consulta = urllib.parse.urlencode({'filename': img['filename'], 'subfolder': img['subfolder'], 'type': img['type']})
    saida.write_bytes(chamar(url, f'/view?{consulta}'))
    return {'motor': 'comfyui', 'servidor': url, 'modelo': MODELO['unet'], 'semente': semente, 'segundos': round(time.time() - inicio)}


def comfy_disponiveis():
    vivos = []
    for url in SERVIDORES:
        try:
            chamar(url, '/system_stats', prazo=10)
            vivos.append(url)
        except Exception as erro:
            print(f'{url} indisponível ({erro})')
    return vivos


def liberar_vram(urls):
    """O servidor é compartilhado (Ollama, HopeGym): devolve a memória ao terminar."""
    for url in urls:
        try:
            chamar(url, '/free', json.dumps({'unload_models': True, 'free_memory': True}).encode(), {'Content-Type': 'application/json'})
        except Exception:
            pass


# ---------- OpenAI ----------
def chave_gpt():
    if os.environ.get('OPENAI_API_KEY'):
        return os.environ['OPENAI_API_KEY']
    achada = re.search(r'sk-[A-Za-z0-9_-]+', GPT_CHAVE.read_text(encoding='utf-8-sig'))
    if not achada:
        raise RuntimeError(f'nenhuma chave sk-... em {GPT_CHAVE}')
    return achada.group()


def gerar_gpt(foto_id, foto, saida):
    largura, altura = foto['tamanho']
    corpo = json.dumps({'model': GPT_MODELO, 'prompt': foto['prompt'], 'size': f'{largura}x{altura}', 'quality': GPT_QUALIDADE, 'n': 1}).encode()
    req = urllib.request.Request('https://api.openai.com/v1/images/generations', corpo,
                                 {'Authorization': f'Bearer {chave_gpt()}', 'Content-Type': 'application/json'})
    inicio = time.time()
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            dados = json.loads(r.read())['data'][0]['b64_json']
    except urllib.error.HTTPError as e:
        raise RuntimeError(f'OpenAI recusou: {e.read().decode()[:600]}') from None
    saida.write_bytes(base64.b64decode(dados))
    return {'motor': 'openai', 'modelo': GPT_MODELO, 'qualidade': GPT_QUALIDADE, 'segundos': round(time.time() - inicio)}


# ---------- comandos ----------
def gerar(fotos, ids, n_variacoes, motor):
    vivos = [] if motor == 'gpt' else comfy_disponiveis()
    if motor == 'comfy' and not vivos:
        sys.exit('Nenhum ComfyUI respondeu (COMFY_URLS).')
    usar_gpt = not vivos
    if usar_gpt:
        n_variacoes = 1  # API paga: uma variação por foto; peça mais com "refazer"
        print(f'Usando a OpenAI ({GPT_MODELO}, qualidade {GPT_QUALIDADE}).')
    tarefas = []
    for foto_id in ids:
        pasta(foto_id).mkdir(parents=True, exist_ok=True)
        if aprovada(foto_id):
            continue
        faltam = n_variacoes - len(variacoes(foto_id))
        tarefas += [foto_id] * max(0, faltam)
    if not tarefas:
        print('Nada pendente.')
        return
    print(f'{len(tarefas)} imagem(ns) em ' + ('1 chamada à OpenAI por vez' if usar_gpt else f'{len(vivos)} GPU(s), {NOME_MODELO}'))
    trava, falhas, total, contador = threading.Lock(), [], len(tarefas), [0]

    def trabalhador(url):
        while True:
            with trava:
                if not tarefas:
                    return
                foto_id = tarefas.pop(0)
                contador[0] += 1
                k = contador[0]
            n = proximo_numero(foto_id)
            saida = pasta(foto_id) / f'v{n}.png'
            try:
                info = gerar_gpt(foto_id, fotos[foto_id], saida) if url is None else gerar_comfy(url, foto_id, fotos[foto_id], saida)
                anotar(foto_id, {'n': n, 'data': date.today().isoformat(), **info})
                print(f'[{k}/{total}] {foto_id} v{n} ({info["segundos"]} s)')
            except Exception as erro:
                falhas.append(foto_id)
                print(f'[{k}/{total}] {foto_id} v{n}: falhou ({erro})')
            finally:
                (pasta(foto_id) / f'v{n}.reservado').unlink(missing_ok=True)

    threads = [threading.Thread(target=trabalhador, args=(u,), daemon=True) for u in (vivos or [None])]
    for t in threads:
        t.start()
    try:
        while any(t.is_alive() for t in threads):
            for t in threads:
                t.join(0.5)
    finally:
        liberar_vram(vivos)
    if falhas:
        print('Falharam:', ' '.join(sorted(set(falhas))))


def cadastro():
    return json.loads(CADASTRO.read_text(encoding='utf-8'))


def aprovada(foto_id):
    return (PUBLICO / f'{foto_id}.webp').exists()


def aprovar(foto_id, n, espelhar=False):
    """--espelhar inverte a imagem na horizontal: o modelo costuma trocar a mão esquerda pela direita."""
    from PIL import Image  # só a aprovação precisa do Pillow
    origem = pasta(foto_id) / f'v{n}.png'
    if not origem.exists():
        sys.exit(f'Não existe {origem.relative_to(ROOT)}')
    dados = cadastro()
    item = next((f for f in dados if f['id'] == foto_id), None)
    if not item:
        sys.exit(f'{foto_id} não está em data/fotografias.json: cadastre as descrições antes de aprovar.')
    PUBLICO.mkdir(parents=True, exist_ok=True)
    destino = PUBLICO / f'{foto_id}.webp'
    img = Image.open(origem).convert('RGB')
    if espelhar:
        img = img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    if img.size != (1536, 1024):
        img = img.resize((1536, 1024), Image.Resampling.LANCZOS)
    for qualidade in (82, 76, 70):  # alvo de 250 KiB
        img.save(destino, 'WEBP', quality=qualidade, method=6)
        if destino.stat().st_size <= 250 * 1024:
            break
    geracao = next((g for g in registro(foto_id) if g['n'] == n), {})
    item['imagem'] = f'fotografias/{foto_id}.webp'
    item['geracao'] = {k: v for k, v in geracao.items() if k != 'servidor'} | ({'espelhada': True} if espelhar else {})
    CADASTRO.write_text(json.dumps(dados, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'{foto_id}: v{n} aprovada -> {destino.relative_to(ROOT)} ({destino.stat().st_size // 1024} KiB)')


def refazer(foto_id):
    shutil.rmtree(pasta(foto_id), ignore_errors=True)
    (PUBLICO / f'{foto_id}.webp').unlink(missing_ok=True)
    print(f'{foto_id}: variações descartadas; rode "gerar {foto_id}".')


def status(fotos):
    cadastrados = {f['id'] for f in cadastro()} if CADASTRO.exists() else set()
    for foto_id in fotos:
        vs = len(variacoes(foto_id))
        print(f'{foto_id:22} {vs} variação(ões)  {"APROVADA" if aprovada(foto_id) else "pendente":9}  {"" if foto_id in cadastrados else "sem cadastro"}')


def main():
    sys.stdout.reconfigure(encoding='utf-8', line_buffering=True)
    args = sys.argv[1:]

    def opcao(nome, padrao):
        if nome in args:
            i = args.index(nome)
            valor = args[i + 1]
            del args[i:i + 2]
            return valor
        return padrao

    etapa = opcao('--etapa', '1')
    n_variacoes = int(opcao('--variacoes', '3'))
    motor = opcao('--motor', 'auto')
    fotos = carregar(etapa)
    comando = args.pop(0) if args and args[0] in ('gerar', 'status', 'aprovar', 'refazer') else 'gerar'
    if comando == 'status':
        return status(fotos)
    if comando == 'aprovar':
        espelhar = '--espelhar' in args
        args = [a for a in args if a != '--espelhar']
        return aprovar(args[0], int(args[1]), espelhar)
    if comando == 'refazer':
        return refazer(args[0])
    ids = args or list(fotos)
    desconhecidos = [i for i in ids if i not in fotos]
    if desconhecidos:
        sys.exit(f'Fora da etapa {etapa}: {" ".join(desconhecidos)}')
    gerar(fotos, ids, n_variacoes, motor)


if __name__ == '__main__':
    main()
