// Sumi-e ink diffusion — multi-color ink drops on textured rice paper
// Each drop spreads through a noise-perturbed Gaussian kernel with a wet-edge
// rim; the cursor acts as an ink brush, pulsing fresh drops at its position.
#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_viscosity;
uniform vec3 u_ink_color;
uniform float u_drop_spread;
uniform float u_paper_texture;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

// Single drop: Gaussian diffusion core + noise-warped front + wet-edge rim.
// age 0..1 grows the drop; viscosity slows the spread and deepens the core.
float dropAmount(vec2 p, vec2 c, float age, float spread, out float core) {
  vec2 q = p - c;
  q += (fbm(q * 7.0 + age * 2.0) - 0.5) * (0.05 + 0.12 * age); // rising turbulence
  float d = length(q);

  float sigma = spread * (0.008 + age * 0.16);
  float peak = 1.0 / (0.12 + sigma * 3.0);
  float body = exp(-d * d / (2.0 * sigma * sigma)) * peak;

  // 晕染 — darker wet rim at the diffusion front
  float front = sigma * 1.7;
  float rim = exp(-(d - front) * (d - front) * 260.0) * 1.4;

  core = exp(-d * d / (2.0 * 0.0006)) * 2.2; // dense ink heart
  return body * 0.75 + rim * 0.35;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.x *= u_resolution.x / u_resolution.y;

  // ── Rice paper: warm ivory ground with fine fiber grain ──
  vec3 paper = vec3(0.968, 0.956, 0.93);
  float fiber = fbm(uv * (90.0 + 90.0 * u_paper_texture));
  float fiberFine = fbm(uv * (220.0 + 140.0 * u_paper_texture) + 7.7);
  paper *= 0.97 + 0.05 * fiber + 0.03 * fiberFine;
  // fibers catch the light in long streaks
  paper += 0.02 * noise(vec2(uv.x * 160.0, uv.y * 18.0));

  vec3 color = paper;

  // ── Ink drops ──
  // 5 ambient drops drift through the composition on slow cycles;
  // 4 cursor drops pulse at the mouse like clicks of a brush.
  float viscositySlow = 0.62 + u_viscosity * 0.38;   // high viscosity = slow spread
  float spread = u_drop_spread / viscositySlow;

  for (float i = 0.0; i < 9.0; i++) {
    float isCursor = step(5.0, i);
    float seed = hash(vec2(i, 1.0));

    float period = mix(9.0 + seed * 7.0, 1.9 + hash(vec2(i, 2.0)) * 1.1, isCursor);
    float age = fract(u_time / period + hash(vec2(i, 3.0)));
    float fade = (1.0 - smoothstep(0.45, 0.95, age)) * smoothstep(0.0, 0.04, age);

    vec2 c = isCursor > 0.5
      ? u_mouse + vec2(cos(i * 2.4) * 0.014, sin(i * 2.4) * 0.014)
      : vec2(hash(vec2(i, 4.0)) * 0.88 + 0.06, hash(vec2(i, 5.0)) * 0.8 + 0.1);

    // Each drop carries a slightly different tone of the current ink
    float tone = 0.8 + hash(vec2(i, 6.0)) * 0.25;
    vec3 ink = mix(vec3(0.02), u_ink_color, 0.72) * tone;

    float core;
    float amount = dropAmount(uv, c, age, spread, core);
    amount *= fade;

    // Ink soaks into the paper fibers — grain breaks up large wet areas
    amount *= 0.9 + 0.2 * (fiber * 2.0 - 0.5);
    float amt = clamp(amount * 0.9, 0.0, 1.0);

    vec3 layer = ink * (0.55 + amt * 0.45 + core * 0.35);
    color = mix(color, mix(layer, paper, 0.12), amt);
    color = mix(color, ink * 1.5, clamp(core * amt, 0.0, 0.5));
  }

  // ── Wet brush glow at the cursor ──
  float brush = exp(-length(uv - u_mouse) * 6.0);
  color = mix(color, paper * 0.92 + u_ink_color * 0.08, brush * 0.12);

  // Soft vignette like a hand-mounted print
  float vig = smoothstep(1.4, 0.5, length((uv - vec2(0.5 * u_resolution.x / u_resolution.y, 0.5)) * 1.15));
  gl_FragColor = vec4(color * (0.94 + 0.06 * vig), 1.0);
}
