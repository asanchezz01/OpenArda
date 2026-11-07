// Céu desenhado num triângulo de tela cheia: gradiente, estrelas, Sol e o
// brilho das Árvores ou das Lâmpadas no horizonte.

import * as THREE from 'three';
import type { UniformesCeu } from './lighting';

export class Ceu {
  readonly cena = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private mat: THREE.ShaderMaterial;
  constructor(u: UniformesCeu) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        ...u,
        uInvProj: { value: new THREE.Matrix4() },
        uCamMat: { value: new THREE.Matrix4() },
        uEspaco: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec2 vNdc;
        void main(){ vNdc = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform mat4 uInvProj; uniform mat4 uCamMat;
        uniform vec3 uZenith; uniform vec3 uHorizon; uniform float uStars;
        uniform vec3 uGlowColor; uniform vec3 uGlowDir; uniform vec3 uSunDir; uniform vec3 uSunColor;
        uniform float uSunDisk; uniform float uFlash; uniform float uTime; uniform float uEspaco;
        varying vec2 vNdc;
        float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
        void main(){
          vec4 v = uInvProj * vec4(vNdc, 1.0, 1.0);
          vec3 dir = normalize((uCamMat * vec4(normalize(v.xyz / v.w), 0.0)).xyz);
          float e = dir.z;
          float t = smoothstep(-0.05, 0.6, e);
          vec3 col = pow(mix(uHorizon, uZenith, pow(t, 0.7)), vec3(2.2));
          // brilho no horizonte (Árvores, Lâmpadas)
          vec3 gd = normalize(vec3(uGlowDir.xy, 0.0));
          float g = max(dot(normalize(vec3(dir.xy, 0.0)), gd), 0.0);
          col += pow(uGlowColor, vec3(2.2)) * pow(g, 6.0) * (1.0 - smoothstep(0.0, 0.5, e)) * 1.2;
          // Sol
          float s = max(dot(dir, uSunDir), 0.0);
          col += uSunColor * (pow(s, 900.0) * 6.0 + pow(s, 12.0) * 0.12) * uSunDisk;
          // estrelas
          // longe do globo, o fundo vira espaço estrelado em todas as direções
          col = mix(col, vec3(0.0015, 0.002, 0.005), uEspaco);
          float est = max(uStars, uEspaco);
          float acima = mix(smoothstep(-0.02, 0.15, e), 1.0, uEspaco);
          if (est > 0.01 && (e > -0.02 || uEspaco > 0.01)) {
            vec3 q = dir * 380.0;
            vec3 c = floor(q);
            float r = h(c);
            if (r > 0.9965) {
              vec3 f = fract(q) - 0.5;
              float d = length(f);
              float tw = 0.75 + 0.25 * sin(uTime * (1.0 + r * 5.0) + r * 40.0);
              col += vec3(0.85, 0.9, 1.0) * smoothstep(0.35, 0.0, d) * est * tw * acima * (r - 0.9965) * 300.0;
            }
          }
          col += vec3(uFlash * 0.25);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }
      `,
    });
    const mesh = new THREE.Mesh(geo, this.mat);
    mesh.frustumCulled = false;
    this.cena.add(mesh);
  }
  atualizar(cam: THREE.PerspectiveCamera, espaco = 0) {
    this.mat.uniforms.uEspaco.value = espaco;
    this.mat.uniforms.uInvProj.value.copy(cam.projectionMatrixInverse);
    this.mat.uniforms.uCamMat.value.copy(cam.matrixWorld);
  }
}
