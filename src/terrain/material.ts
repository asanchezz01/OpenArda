// Material do terreno: cor por bioma, relevo sombreado, água, neve, luz das
// Duas Árvores (com visibilidade calculada pelo relevo), Lâmpadas, Sol e névoa.

import * as THREE from 'three';

export interface UniformesGlobais {
  uExag: { value: number };
  uSunDir: { value: THREE.Vector3 };
  uSunColor: { value: THREE.Color };
  uSky: { value: THREE.Color };
  uGround: { value: THREE.Color };
  uTreeColor: { value: THREE.Color };
  uTreePos: { value: THREE.Vector3 };
  uTreeRadius: { value: number };
  uLamp1Pos: { value: THREE.Vector3 };
  uLamp1Color: { value: THREE.Color };
  uLamp2Pos: { value: THREE.Vector3 };
  uLamp2Color: { value: THREE.Color };
  uFogColor: { value: THREE.Color };
  uFogDensity: { value: number };
  uTime: { value: number };
  uCurv: { value: THREE.Vector3 };
  uVeil: { value: number };
  uCertShow: { value: number };
  uSnowLine: { value: number };
  uWarmth: { value: number };
  uOverlayLight: { value: number };
}

export function criarUniformesGlobais(): UniformesGlobais {
  return {
    uExag: { value: 2.5 },
    uSunDir: { value: new THREE.Vector3(-0.5, 0.45, 0.74).normalize() },
    uSunColor: { value: new THREE.Color(1, 0.96, 0.9) },
    uSky: { value: new THREE.Color(0.45, 0.55, 0.7) },
    uGround: { value: new THREE.Color(0.18, 0.16, 0.12) },
    uTreeColor: { value: new THREE.Color(0, 0, 0) },
    uTreePos: { value: new THREE.Vector3(-3960, -150, 1.6) },
    uTreeRadius: { value: 1700 },
    uLamp1Pos: { value: new THREE.Vector3(3450, 1250, 6) },
    uLamp1Color: { value: new THREE.Color(0, 0, 0) },
    uLamp2Pos: { value: new THREE.Vector3(3450, -1550, 6) },
    uLamp2Color: { value: new THREE.Color(0, 0, 0) },
    uFogColor: { value: new THREE.Color(0.62, 0.7, 0.8) },
    uFogDensity: { value: 0.00035 },
    uTime: { value: 0 },
    uCurv: { value: new THREE.Vector3(0, 0, 0) },
    uVeil: { value: 0 },
    uCertShow: { value: 0 },
    uSnowLine: { value: 2.6 },
    uWarmth: { value: 0 },
    uOverlayLight: { value: 1 },
  };
}

const vert = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
uniform vec2 uOrigin;
uniform float uSize;
uniform float uExag;
uniform float uMorph;
uniform float uSkirt;
uniform vec3 uCurv;
attribute vec2 aH;
attribute vec2 aW;
attribute vec2 aG;
attribute vec4 aB;
attribute vec4 aE;
attribute float aSkirt;
attribute float aV;
varying float vV;
varying vec3 vWorld;
varying float vH;
varying float vW;
varying vec2 vG;
varying vec4 vB;
varying vec4 vE;
varying float vDist;
void main() {
  float h = mix(aH.y, aH.x, uMorph);
  float w = mix(aW.y, aW.x, uMorph);
  float surf = w > -50.0 ? max(h, w) : h;
  vec2 xy = uOrigin + position.xy * uSize;
  float z = surf > 0.0 ? surf * uExag : surf * 0.02;
  z -= aSkirt * uSkirt;
  vec2 d = xy - uCurv.xy;
  z -= dot(d, d) * uCurv.z * 0.5;
  vec3 p = vec3(xy, z);
  vWorld = vec3(xy, surf * uExag);
  vH = h;
  vW = w;
  vG = aG;
  vB = aB;
  vE = aE;
  vV = aV;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vDist = -mv.z;
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}
`;

const frag = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uExag;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSky;
uniform vec3 uGround;
uniform vec3 uTreeColor;
uniform vec3 uTreePos;
uniform float uTreeRadius;
uniform vec3 uLamp1Pos;
uniform vec3 uLamp1Color;
uniform vec3 uLamp2Pos;
uniform vec3 uLamp2Color;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uTime;
uniform float uVeil;
uniform float uCertShow;
uniform float uSnowLine;
uniform float uWarmth;
uniform float uOverlayLight;
uniform sampler2D uOverlay;
uniform float uHasOverlay;
uniform vec2 uOrigin;
uniform float uSize;
varying vec3 vWorld;
varying float vH;
varying float vW;
varying vec2 vG;
varying vec4 vB;
varying vec4 vE;
varying float vDist;
varying float vV;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// ruído com atenuação por distância (evita serrilhado de longe); w = mundo por pixel
float detalheW(vec2 p, float escala, float w) {
  float a = 1.0 - smoothstep(0.3 * escala, 1.3 * escala, w);
  if (a <= 0.0) return 0.5;
  return mix(0.5, vnoise(p / escala), a);
}
vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
vec3 especieCor(float e) {
  if (e < 0.5) return vec3(0.16, 0.27, 0.11);
  if (e < 1.5) return vec3(0.09, 0.20, 0.13);
  if (e < 2.5) return vec3(0.58, 0.50, 0.17);
  if (e < 3.5) return vec3(0.26, 0.50, 0.22);
  return vec3(0.07, 0.10, 0.07);
}

void main() {
  #include <logdepthbuf_fragment>
  vec3 V = normalize(cameraPosition - vWorld);
  float cert = vE.z;
  bool agua = vW > -20.0 && vH < vW - 0.0004;
  float esp = floor(vE.y + 0.5);
  float treeVis = vV;
  vec3 col;
  vec3 N;
  float rough = 1.0;
  vec3 luz;

  // luz das Duas Árvores
  vec2 dT = uTreePos.xy - vWorld.xy;
  float distT = length(dT);
  float fallT = 1.0 / (1.0 + pow(distT / (uTreeRadius * 0.42), 2.0));
  fallT *= 1.0 - smoothstep(uTreeRadius * 0.8, uTreeRadius, distT);
  vec3 LT = normalize(vec3(dT, (uTreePos.z * uExag - vWorld.z) * 1.0 + distT * 0.04));

  if (agua) {
    float prof = vW - vH;
    N = vec3(0.0, 0.0, 1.0);
    vec2 wp = vWorld.xy;
    float t = uTime;
    float nA = vnoise(wp * 0.9 + vec2(t * 0.05, t * 0.03)) - 0.5;
    float nB = vnoise(wp * 2.3 - vec2(t * 0.04, -t * 0.06)) - 0.5;
    float wav = 1.0 - smoothstep(30.0, 400.0, vDist);
    N = normalize(vec3(nA * 0.12 * wav + nB * 0.06 * wav, nB * 0.12 * wav - nA * 0.05 * wav, 1.0));
    vec3 raso = lin(vec3(0.16, 0.42, 0.48));
    vec3 fundo = lin(vec3(0.03, 0.10, 0.20));
    float k = exp(-prof * 6.0);
    col = mix(fundo, raso, k * 0.85);
    col = mix(col, lin(vec3(0.04, 0.11, 0.22)), smoothstep(0.5, 3.5, prof) * 0.6);
    float espuma = smoothstep(0.015, 0.0, prof) * 0.12;
    col += espuma;
    float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
    float dif = max(dot(N, uSunDir), 0.0);
    vec3 R = reflect(-uSunDir, N);
    float spec = pow(max(dot(R, V), 0.0), 260.0) * 0.45 * wav;
    luz = uSky * 0.55 + uSunColor * (0.45 * dif);
    col = col * luz + uSunColor * spec + lin(uSky) * fres * 0.5;
    if (treeVis > 0.001) {
      vec3 RT = reflect(-LT, N);
      float sT = pow(max(dot(RT, V), 0.0), 40.0);
      col += uTreeColor * treeVis * fallT * (0.35 + sT * 1.6);
    }
    vec3 dL1 = uLamp1Pos - vWorld; float f1 = 1.0 / (1.0 + pow(length(dL1.xy) / 1300.0, 2.0));
    vec3 dL2 = uLamp2Pos - vWorld; float f2 = 1.0 / (1.0 + pow(length(dL2.xy) / 1300.0, 2.0));
    vec3 Rl1 = reflect(-normalize(dL1 + vec3(0.0, 0.0, length(dL1.xy) * 0.25)), N);
    vec3 Rl2 = reflect(-normalize(dL2 + vec3(0.0, 0.0, length(dL2.xy) * 0.25)), N);
    col = col * (1.0 + (uLamp1Color * f1 + uLamp2Color * f2) * 0.35) + (uLamp1Color * f1 * pow(max(dot(Rl1, V), 0.0), 60.0) + uLamp2Color * f2 * pow(max(dot(Rl2, V), 0.0), 60.0)) * 0.6;
  } else {
    N = normalize(vec3(-vG.x * uExag, -vG.y * uExag, 1.0));
    float slope = 1.0 - N.z;
    float h = vH;
    vec2 P = vWorld.xy;
    float W = fwidth(P.x) + fwidth(P.y);
    float d1 = detalheW(P, 1.6, W) * 0.7 + detalheW(P + 3.3, 0.55, W) * 0.3;
    float d2 = detalheW(P, 9.0, W);
    float d3 = detalheW(P, 45.0, W);
    // planícies e colinas
    float umid = detalheW(P + 91.0, 140.0, W);
    vec3 planicie = mix(vec3(0.31, 0.43, 0.19), vec3(0.47, 0.47, 0.27), d3);
    planicie = mix(planicie, vec3(0.26, 0.38, 0.17), smoothstep(0.55, 0.8, umid) * 0.6);
    planicie = mix(planicie, vec3(0.52, 0.49, 0.32), smoothstep(0.45, 0.2, umid) * 0.5);
    planicie = mix(planicie, vec3(0.38, 0.40, 0.24), smoothstep(0.15, 0.6, h));
    vec3 exub = mix(vec3(0.27, 0.52, 0.20), vec3(0.40, 0.60, 0.26), d2);
    planicie = mix(planicie, exub, vE.w);
    col = planicie * (0.86 + 0.28 * d1);
    // biomas
    float pont = detalheW(P + 17.0, 2.4, W) * 0.6 + d1 * 0.4;
    float borda = (pont - 0.5) * 0.9;
    float arido = smoothstep(0.25, 0.75, vB.z + borda);
    float pant = smoothstep(0.25, 0.75, vB.y + borda);
    float cinza = smoothstep(0.25, 0.75, vB.w + borda);
    col = mix(col, mix(vec3(0.66, 0.58, 0.40), vec3(0.76, 0.67, 0.48), d2) * (0.9 + 0.2 * d1), arido * 0.85);
    col = mix(col, mix(vec3(0.20, 0.27, 0.20), vec3(0.28, 0.33, 0.22), d1), pant * 0.85);
    col = mix(col, mix(vec3(0.17, 0.15, 0.14), vec3(0.26, 0.22, 0.19), d1), cinza);
    // florestas
    float fdens = smoothstep(0.2, 0.7, vB.x + borda) * (0.8 + 0.4 * d1);
    vec3 fc = especieCor(esp) * (0.8 + 0.4 * detalheW(P - 7.0, 0.7, W));
    col = mix(col, fc, clamp(fdens, 0.0, 1.0));
    // rocha nas encostas e nas alturas
    vec3 rocha = mix(vec3(0.42, 0.39, 0.35), vec3(0.55, 0.52, 0.48), d2) * (0.85 + 0.3 * d1);
    float pedra = smoothstep(0.35, 0.65, slope * uExag * 0.6 + smoothstep(1.4, 3.0, h) * 0.6);
    col = mix(col, rocha, pedra);
    // neve
    float linhaNeve = uSnowLine - 0.0003 * max(0.0, vWorld.y - 300.0) + (d2 - 0.5) * 0.5;
    float neve = smoothstep(linhaNeve - 0.15, linhaNeve + 0.15, h) * (1.0 - smoothstep(0.55, 0.85, slope * uExag * 0.5));
    neve = max(neve, vE.x);
    col = mix(col, vec3(0.92, 0.94, 0.97) * (0.92 + 0.1 * d1), clamp(neve, 0.0, 1.0));
    // reconstrução artística: menos saturação
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(lum) * vec3(1.0, 0.98, 0.94), (1.0 - cert) * (0.22 + 0.5 * uCertShow));
    col = lin(col);
    // iluminação
    float dif = max(dot(N, uSunDir), 0.0);
    // sombreamento cartográfico fixo (luz do noroeste) para manter o relevo legível
    float hs = dot(N, normalize(vec3(-0.55, 0.55, 0.62)));
    col *= mix(1.0, clamp(0.25 + hs * 1.05, 0.18, 1.45), 0.58);
    float amb = 0.55 + 0.45 * N.z;
    luz = uSunColor * dif + uSky * amb * 0.55 + uGround * (1.0 - N.z) * 0.4;
    // oclusão aproximada nos vales
    luz *= 0.82 + 0.18 * smoothstep(-0.2, 0.2, vG.x * 0.0 + N.z - 0.6);
    if (treeVis > 0.001) {
      float dT2 = max(dot(N, LT), 0.0);
      luz += uTreeColor * treeVis * fallT * (0.30 + 0.85 * dT2);
    }
    vec3 dL1 = uLamp1Pos - vWorld; float f1 = 1.0 / (1.0 + pow(length(dL1.xy) / 1300.0, 2.0));
    vec3 dL2 = uLamp2Pos - vWorld; float f2 = 1.0 / (1.0 + pow(length(dL2.xy) / 1300.0, 2.0));
    vec3 L1 = normalize(dL1 + vec3(0.0, 0.0, length(dL1.xy) * 0.3));
    vec3 L2 = normalize(dL2 + vec3(0.0, 0.0, length(dL2.xy) * 0.3));
    luz += uLamp1Color * f1 * (0.3 + 0.7 * max(dot(N, L1), 0.0)) + uLamp2Color * f2 * (0.3 + 0.7 * max(dot(N, L2), 0.0));
    col *= luz;
    // brilho próprio de Aman em modo velado
    col = mix(col, col * 0.8 + lin(vec3(0.95, 0.85, 0.55)) * 0.12, uVeil);
  }
  // sobreposição vetorial (rios, estradas, fronteiras)
  if (uHasOverlay > 0.5) {
    vec2 uv = (vWorld.xy - uOrigin) / uSize;
    vec4 ov = texture2D(uOverlay, uv);
    col = mix(col, ov.rgb * uOverlayLight, ov.a);
  }
  // névoa atmosférica
  float fog = 1.0 - exp(-pow(vDist * uFogDensity, 1.25));
  col = mix(col, lin(uFogColor), clamp(fog, 0.0, 1.0));
  if (uVeil > 0.5 && agua) discard;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function criarMaterialTile(g: UniformesGlobais): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...g,
      uOrigin: { value: new THREE.Vector2() },
      uSize: { value: 1 },
      uMorph: { value: 1 },
      uSkirt: { value: 1 },
      uOverlay: { value: null },
      uHasOverlay: { value: 0 },
    },
    vertexShader: vert,
    fragmentShader: frag,
    extensions: { derivatives: true } as unknown as THREE.ShaderMaterial['extensions'],
  });
}
