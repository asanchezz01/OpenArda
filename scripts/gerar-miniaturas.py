#!/usr/bin/env python3
"""Gera WebP de navegação sem alterar os originais: python scripts/gerar-miniaturas.py.

Requer Pillow, já usado pelo fluxo de imagens. Execute após aprovar novas imagens.
O atlas usa o original quando ainda não há miniatura no manifesto.
"""
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
PUBLICO = ROOT / 'public'


def gerar():
    manifesto = {}
    bytes_antes = bytes_depois = 0
    for pasta, tamanho in [('retratos', 192), ('fotografias', 640)]:
        cadastro = json.loads((ROOT / 'data' / f'{pasta}.json').read_text(encoding='utf-8'))
        for item in cadastro:
            origem = item.get('imagem')
            if not origem or origem in manifesto:
                continue
            arquivo = (PUBLICO / origem).resolve()
            assert arquivo.is_relative_to((PUBLICO / pasta).resolve()), f'Imagem fora de public/{pasta}: {origem}'
            assert arquivo.is_file(), f'Original ausente: {origem}'
            dados = arquivo.read_bytes()
            chave = hashlib.sha256(dados + f'{tamanho}:webp:80:6'.encode()).hexdigest()[:16]
            destino = PUBLICO / 'miniaturas' / pasta / f'{arquivo.stem}-{chave}.webp'
            if not destino.exists():
                destino.parent.mkdir(parents=True, exist_ok=True)
                with Image.open(arquivo) as original:
                    imagem = ImageOps.exif_transpose(original).convert('RGB')
                    imagem.thumbnail((tamanho, tamanho), Image.Resampling.LANCZOS)
                    imagem.save(destino, 'WEBP', quality=80, method=6)
            with Image.open(destino) as imagem:
                assert imagem.format == 'WEBP' and 0 < max(imagem.size) <= tamanho, f'Miniatura inválida: {destino}'
            manifesto[origem] = destino.relative_to(PUBLICO).as_posix()
            bytes_antes += len(dados)
            bytes_depois += destino.stat().st_size
    assert manifesto, 'Nenhuma imagem cadastrada'
    (ROOT / 'data' / 'miniaturas.json').write_text(
        json.dumps(dict(sorted(manifesto.items())), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(manifesto)} miniaturas: {bytes_antes / 1048576:.2f} MiB -> {bytes_depois / 1048576:.2f} MiB')


if __name__ == '__main__':
    gerar()
