// Starry Night — Van Gogh
#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_turbulence;
uniform float u_star_brightness;
uniform float u_color_shift;

// ── Standard noise library (matching Book of Shaders conventions) ──

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5, f = 1.0;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p * f);
    f *= 2.1;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.x *= u_resolution.x / u_resolution.y;

  float t = u_time * 0.15 * u_turbulence;

  // ── Sky gradient ──
  vec3 skyTop = vec3(0.04, 0.06, 0.30);
  vec3 skyMid = vec3(0.12, 0.18, 0.50);
  vec3 skyLow = vec3(0.08, 0.12, 0.35);
  vec3 sky = mix(skyLow, skyMid, smoothstep(0.15, 0.50, uv.y));
  sky = mix(sky, skyTop, smoothstep(0.50, 0.85, uv.y));

  // Color shift — twilight purple cast across the whole scene
  vec3 twilight = vec3(0.38, 0.14, 0.45);
  sky = mix(sky, twilight, u_color_shift * 0.55);

  // ── Van Gogh's swirling sky (enhanced turbulence) ──
  vec2 q = uv;
  q.x += sin(uv.y * 3.0 + t * 2.0) * 0.06;
  q.y += cos(uv.x * 2.5 + t * 2.5) * 0.04;

  float swirl = fbm(q * 8.0 + t);
  swirl += fbm(q * 4.0 - t * 0.7) * 0.5;
  swirl += fbm(q * 2.0 + t * 0.3) * 0.25;

  // Impasto brushstroke texture
  float brush = fbm(uv * 60.0 + t * 0.5) * 0.04;
  float brushDetail = fbm(uv * 120.0 - t * 0.3) * 0.02;

  // Swirl bands (Van Gogh's characteristic brush direction)
  float bands = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 offset = vec2(sin(fi * 1.8 + t * 1.3), cos(fi * 1.3 + t * 1.5)) * 0.15;
    float b = sin((uv.x + offset.x) * 8.0 + fi * 2.0 + swirl * 2.5 + t * 1.3) * 0.5 + 0.5;
    b *= sin((uv.y + offset.y) * 5.0 + fi * 1.5 + swirl * 1.8) * 0.5 + 0.5;
    bands += b * 0.15;
  }
  bands = smoothstep(0.30, 0.80, bands);

  // ── Stars with halos, breathing with the cursor ──
  float stars = 0.0;
  vec3 starColor = vec3(0.0);
  for (int i = 0; i < 18; i++) {
    float fi = float(i);
    vec2 sp = vec2(hash(vec2(fi, 0.0)), hash(vec2(fi, 1.0)));
    sp.x = sp.x * 0.70 + 0.10;
    sp.y = sp.y * 0.38 + 0.46;

    float d = length(uv - sp);
    float size = 25.0 + hash(vec2(fi, 3.0)) * 35.0;

    // Twinkling with phase offset per star, brightened near the cursor
    float breathe = 0.5 + 0.5 * sin(u_time * (1.5 + hash(vec2(fi, 2.0)) * 2.0) + fi * 3.0);
    float nearMouse = exp(-length(sp - u_mouse) * 7.0);
    float twinkle = breathe * (0.55 + 0.9 * nearMouse);

    float core = exp(-d * d * size * size) * twinkle * 0.7 * u_star_brightness;
    float halo = exp(-d * d * size * size * 0.08) * 0.12 * u_star_brightness;
    float glow = exp(-d * size * 3.0) * 0.05 * u_star_brightness;

    // Color temperature variation, warmed by the color shift
    float temp = fract(hash(vec2(fi, 4.0)) + u_color_shift * 0.45);
    vec3 sc = mix(vec3(1.0, 0.95, 0.6), vec3(0.7, 0.85, 1.0), temp);

    stars += core + halo + glow;
    starColor += (core * 0.8 + halo) * sc;
  }

  // ── Meteor streaks trailing the mouse ──
  float meteors = 0.0;
  vec3 meteorColor = vec3(1.0, 0.95, 0.8);
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float seed = hash(vec2(fi, 9.0));
    float ang = hash(vec2(fi, 10.0)) * 6.28318 + u_time * 0.25 * (0.5 + seed);
    vec2 dir = vec2(cos(ang), sin(ang));
    float prog = fract(u_time * (0.7 + seed * 0.6) + fi * 0.37);
    float len = 0.10 + seed * 0.12;
    vec2 head = u_mouse + dir * prog * 0.55;

    vec2 rel = uv - head;
    float along = dot(rel, -dir);
    float perp = abs(dot(rel, vec2(-dir.y, dir.x)));

    float streak = exp(-perp * 55.0) * exp(-along * 9.0);
    streak *= smoothstep(0.0, 0.02, along) * (1.0 - smoothstep(len - 0.02, len, along));
    float headGlow = exp(-length(rel) * 12.0) * 0.5;

    meteors += streak * 0.7 + headGlow * 0.4;
  }

  // ── Crescent moon with glow ──
  vec2 moonPos = vec2(0.78, 0.78);
  float moonD = length(uv - moonPos);
  float moon = smoothstep(0.06, 0.054, moonD);
  float moonShadow = smoothstep(0.06, 0.054, length(uv - moonPos + vec2(0.028, 0.012)));
  moon -= moonShadow;
  float moonGlow = exp(-moonD * 5.0) * 0.3;

  // ── Cypress tree (dark vertical flame) ──
  float tree = 0.0;
  vec2 tp = uv - vec2(0.14, 0.04);
  float treeShape = length(tp) * 2.5 - tp.y * 1.8;
  treeShape += sin(tp.y * 12.0 + noise(tp * 3.5) * 3.5) * 0.07;
  treeShape += sin(tp.y * 6.0 + noise(tp * 2.0 + 1.5) * 2.0) * 0.04;
  tree = smoothstep(0.012, 0.0, abs(treeShape));
  tree *= smoothstep(-0.08, 0.55, tp.y);

  // Tree texture
  float treeTex = noise(tp * 40.0) * 0.3 + noise(tp * 20.0) * 0.2;
  tree *= 0.75 + treeTex;

  // ── Village silhouette ──
  float village = 0.0;
  if (uv.y < 0.22) {
    village = noise(uv * vec2(140.0, 8.0)) * 0.55;
    village += noise(uv * vec2(70.0, 4.0)) * 0.25;
    village = smoothstep(0.35, 0.65, village);
    village *= smoothstep(0.23, 0.0, uv.y);
  }

  // Windows
  float windows = 0.0;
  if (uv.y < 0.15) {
    float wx = fract(uv.x * 22.0 + hash(vec2(floor(uv.x * 22.0), 0.0)) * 2.0);
    float wy = fract(uv.y * 10.0);
    windows = smoothstep(0.22, 0.30, wx) * smoothstep(0.25, 0.35, wy);
    windows *= smoothstep(0.20, 0.04, uv.y);
    windows *= step(0.3, hash(vec2(floor(uv.x * 22.0), floor(uv.y * 10.0))));
  }

  // ── Composite ──
  vec3 darkBlue = vec3(0.03, 0.05, 0.18);
  vec3 lightBlue = vec3(0.18, 0.32, 0.65);
  vec3 yellow = vec3(1.0, 0.82, 0.25);
  vec3 white = vec3(0.95, 0.92, 0.85);

  vec3 color = mix(darkBlue, lightBlue, swirl * 0.7);
  color = mix(color, lightBlue * 1.1, bands * 0.55);
  color += starColor * 0.9;
  color += meteorColor * meteors * 0.8;
  color += moon * white * 0.75;
  color += moonGlow * vec3(1.0, 0.9, 0.6);

  color = mix(color, vec3(0.015, 0.03, 0.06), tree * 0.88);
  color = mix(color, vec3(0.01, 0.015, 0.04), village * 0.82);
  color += windows * yellow * 0.35;

  // Brushstroke texture overlay
  color += brush * mix(darkBlue, lightBlue, swirl) * 0.3;
  color += brushDetail;

  // Subtle vignette
  color *= 1.0 - length((uv - 0.5) * vec2(1.0, 0.7)) * 0.25;

  gl_FragColor = vec4(color, 1.0);
}
