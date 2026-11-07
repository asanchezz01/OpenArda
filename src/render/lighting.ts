// Iluminação própria de cada período: Lâmpadas, Duas Árvores, escuridão sob
// as estrelas, e o Sol a partir da Primeira Era.

import * as THREE from 'three';
import type { UniformesGlobais } from '../terrain/material';
import { tempo } from '../core/data';

export interface UniformesCeu {
  uZenith: { value: THREE.Color };
  uHorizon: { value: THREE.Color };
  uStars: { value: number };
  uGlowColor: { value: THREE.Color };
  uGlowDir: { value: THREE.Vector3 };
  uSunDir: { value: THREE.Vector3 };
  uSunColor: { value: THREE.Color };
  uSunDisk: { value: number };
  uFlash: { value: number };
  uTime: { value: number };
}

export function criarUniformesCeu(): UniformesCeu {
  return {
    uZenith: { value: new THREE.Color(0.2, 0.35, 0.6) },
    uHorizon: { value: new THREE.Color(0.7, 0.75, 0.82) },
    uStars: { value: 0 },
    uGlowColor: { value: new THREE.Color(0, 0, 0) },
    uGlowDir: { value: new THREE.Vector3(-1, 0, 0.1).normalize() },
    uSunDir: { value: new THREE.Vector3(-0.5, 0.45, 0.74).normalize() },
    uSunColor: { value: new THREE.Color(1, 0.95, 0.85) },
    uSunDisk: { value: 1 },
    uFlash: { value: 0 },
    uTime: { value: 0 },
  };
}

const PRATA = new THREE.Color(0.72, 0.8, 1.0);
const OURO = new THREE.Color(1.0, 0.74, 0.3);

function brilho(u: number): number {
  if (u < 0 || u > 7) return 0;
  return Math.pow(Math.sin((Math.PI * u) / 7), 1.15);
}

/** Intensidades de Telperion e Laurelin numa hora do ciclo de 12 horas. */
export function luzDasArvores(hora: number): { telperion: number; laurelin: number; cor: THREE.Color; fase: string } {
  const h = ((hora % 12) + 12) % 12;
  const t = brilho(h);
  const l = brilho((h - 6 + 12) % 12);
  const cor = PRATA.clone().multiplyScalar(t).add(OURO.clone().multiplyScalar(l));
  let fase = 'Telperion';
  if (t > 0.05 && l > 0.05) fase = 'Mistura das luzes';
  else if (l > t) fase = 'Laurelin';
  return { telperion: t, laurelin: l, cor, fase };
}

let marcos: { lamp0: number; lampFim: number; arv0: number; escuro: number; sol: number } | null = null;
function m() {
  if (!marcos) {
    marcos = {
      lamp0: tempo.fronteira('AL:#al-lampadas', 0),
      lampFim: tempo.fronteira('AL:#al-queda-lampadas', 0),
      arv0: tempo.fronteira('AA:#aa-arvores', 0),
      escuro: tempo.fronteira('AA:#aa-escurecimento', 0),
      sol: tempo.fronteira('PE:inicio', 2),
    };
  }
  return marcos;
}

export type Regime = 'trevas' | 'lampadas' | 'arvores' | 'escuridao' | 'sol';

export function regimeDe(t: number): Regime {
  const k = m();
  if (t < k.lamp0) return 'trevas';
  if (t < k.lampFim) return 'lampadas';
  if (t < k.arv0) return 'trevas';
  if (t < k.escuro) return 'arvores';
  if (t < k.sol) return 'escuridao';
  return 'sol';
}

export interface ContextoLuz {
  t: number;
  hora: number;
  alvo: THREE.Vector2;
  tempestade: number; // 0..1
  relampago: number;
  veu: number;
}

export function aplicarIluminacao(u: UniformesGlobais, c: UniformesCeu, ctx: ContextoLuz) {
  const regime = regimeDe(ctx.t);
  const era = tempo.eraDe(ctx.t).id;
  const sunDir = new THREE.Vector3();
  const sun = new THREE.Color();
  const sky = new THREE.Color();
  const ground = new THREE.Color();
  const fog = new THREE.Color();
  const zen = new THREE.Color();
  const hor = new THREE.Color();
  let fogD = 0.00032;
  let estrelas = 0;
  let disco = 0;
  const arv = new THREE.Color(0, 0, 0);
  const l1 = new THREE.Color(0, 0, 0);
  const l2 = new THREE.Color(0, 0, 0);
  const glow = new THREE.Color(0, 0, 0);
  const glowDir = new THREE.Vector3(-1, 0, 0.15);
  let snow = 2.6;

  // luz difusa das estrelas (direcional fraca, de cima)
  const luzEstelar = () => {
    sunDir.set(-0.35, 0.25, 0.9).normalize();
    sun.setRGB(0.16, 0.19, 0.3);
    sky.setRGB(0.16, 0.19, 0.3);
    ground.setRGB(0.03, 0.035, 0.05);
    fog.setRGB(0.05, 0.065, 0.11);
    zen.setRGB(0.01, 0.015, 0.04);
    hor.setRGB(0.05, 0.065, 0.11);
    estrelas = 1;
    fogD = 0.00042;
  };

  switch (regime) {
    case 'trevas':
      luzEstelar();
      sun.multiplyScalar(0.75);
      sky.multiplyScalar(0.8);
      estrelas = 0.35;
      break;
    case 'lampadas': {
      sunDir.set(0.1, 0.05, 1).normalize();
      sun.setRGB(0.32, 0.3, 0.26);
      sky.setRGB(0.42, 0.4, 0.34);
      ground.setRGB(0.2, 0.18, 0.12);
      fog.setRGB(0.48, 0.44, 0.36);
      zen.setRGB(0.22, 0.24, 0.3);
      hor.setRGB(0.56, 0.5, 0.4);
      l1.setRGB(1.25, 1.12, 0.86);
      l2.setRGB(1.25, 1.06, 0.8);
      estrelas = 0;
      break;
    }
    case 'arvores': {
      luzEstelar();
      const a = luzDasArvores(ctx.hora);
      arv.copy(a.cor).multiplyScalar(1.85);
      // perto de Aman o céu se enche da luz das Árvores
      const dA = ctx.alvo.distanceTo(new THREE.Vector2(-3960, -150));
      const fA = THREE.MathUtils.smoothstep(2600, 700, dA);
      glow.copy(a.cor).multiplyScalar(0.55 * fA + 0.08);
      const intens = Math.max(a.telperion, a.laurelin);
      zen.lerp(new THREE.Color(0.05, 0.06, 0.12).add(a.cor.clone().multiplyScalar(0.12)), fA);
      hor.lerp(a.cor.clone().multiplyScalar(0.42).add(new THREE.Color(0.05, 0.05, 0.08)), fA * (0.5 + 0.5 * intens));
      fog.lerp(a.cor.clone().multiplyScalar(0.25).add(new THREE.Color(0.06, 0.07, 0.1)), fA * 0.7);
      sky.lerp(a.cor.clone().multiplyScalar(0.18).add(new THREE.Color(0.1, 0.12, 0.18)), fA);
      estrelas = 1 - fA * 0.6;
      break;
    }
    case 'escuridao':
      luzEstelar();
      sun.multiplyScalar(0.8);
      sky.multiplyScalar(0.75);
      zen.setRGB(0.006, 0.008, 0.02);
      break;
    case 'sol': {
      sunDir.set(-0.48, 0.42, 0.77).normalize();
      disco = 1;
      if (era === 'PE') {
        sun.setRGB(1.12, 0.98, 0.82);
        sky.setRGB(0.5, 0.56, 0.68);
        fog.setRGB(0.68, 0.7, 0.74);
        zen.setRGB(0.18, 0.3, 0.55);
        hor.setRGB(0.78, 0.76, 0.74);
        fogD = 0.00034;
        snow = 2.4;
      } else if (era === 'SE') {
        sun.setRGB(1.1, 1.02, 0.92);
        sky.setRGB(0.5, 0.6, 0.76);
        fog.setRGB(0.64, 0.72, 0.82);
        zen.setRGB(0.14, 0.3, 0.6);
        hor.setRGB(0.72, 0.78, 0.86);
        fogD = 0.0003;
        snow = 2.6;
      } else if (era === 'TE') {
        sun.setRGB(1.02, 0.97, 0.9);
        sky.setRGB(0.5, 0.57, 0.68);
        fog.setRGB(0.66, 0.7, 0.76);
        zen.setRGB(0.18, 0.3, 0.52);
        hor.setRGB(0.74, 0.76, 0.8);
        fogD = 0.00036;
        snow = 2.5;
      } else {
        sun.setRGB(1.1, 1.0, 0.86);
        sky.setRGB(0.52, 0.6, 0.72);
        fog.setRGB(0.72, 0.74, 0.76);
        zen.setRGB(0.16, 0.3, 0.56);
        hor.setRGB(0.8, 0.79, 0.76);
        fogD = 0.0003;
        snow = 2.6;
      }
      ground.setRGB(0.2, 0.18, 0.14);
      break;
    }
  }

  // tempestade da Queda
  if (ctx.tempestade > 0) {
    const k = ctx.tempestade;
    sun.lerp(new THREE.Color(0.16, 0.17, 0.2), k * 0.85);
    sky.lerp(new THREE.Color(0.18, 0.2, 0.24), k * 0.8);
    fog.lerp(new THREE.Color(0.18, 0.19, 0.22), k * 0.85);
    zen.lerp(new THREE.Color(0.06, 0.06, 0.08), k);
    hor.lerp(new THREE.Color(0.2, 0.2, 0.24), k);
    fogD *= 1 + 1.5 * k;
    disco *= 1 - k;
    const fl = ctx.relampago;
    sky.add(new THREE.Color(fl * 0.8, fl * 0.85, fl));
    hor.add(new THREE.Color(fl * 0.6, fl * 0.65, fl * 0.8));
  }
  if (ctx.veu > 0) {
    glow.lerp(new THREE.Color(0.9, 0.78, 0.45), ctx.veu * 0.6);
    hor.lerp(new THREE.Color(0.82, 0.72, 0.5), ctx.veu * 0.6);
  }

  u.uSunDir.value.copy(sunDir);
  u.uSunColor.value.copy(sun);
  u.uSky.value.copy(sky);
  u.uGround.value.copy(ground);
  u.uFogColor.value.copy(fog);
  u.uFogDensity.value = fogD;
  u.uTreeColor.value.copy(arv);
  u.uLamp1Color.value.copy(l1);
  u.uLamp2Color.value.copy(l2);
  u.uSnowLine.value = snow;
  u.uOverlayLight.value = regime === 'sol' ? 1 : regime === 'lampadas' ? 0.85 : 0.62;

  c.uZenith.value.copy(zen);
  c.uHorizon.value.copy(hor);
  c.uStars.value = estrelas;
  c.uGlowColor.value.copy(glow);
  c.uGlowDir.value.copy(glowDir).normalize();
  c.uSunDir.value.copy(sunDir);
  c.uSunColor.value.copy(sun);
  c.uSunDisk.value = disco;
  c.uFlash.value = ctx.relampago;
  return regime;
}
