// Star nebula — multi-colored particle swarm
// Attract / repel dual mode. Each particle has an independent orbit phase and
// color index; trails are accumulated with exponential alpha decay.
#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_particle_count;
uniform float u_attract_repel; // 0.0 = attract, 1.0 = repel
uniform float u_color_theme;   // 0..1 selects from 4 palettes
uniform float u_trail_length;  // 0..1 trail persistence

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
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

// Warm / cool palette picked by u_color_theme (4 themes, hue-mixed)
vec3 themeColor(float t, float x) {
  float hue = fract(t + x);
  vec3 c = 0.5 + 0.5 * cos(6.28318 * (hue + vec3(0.0, 0.33, 0.67)));
  vec3 themeA = vec3(0.6, 0.35, 0.9);  // violet nebula
  vec3 themeB = vec3(0.25, 0.8, 1.0);  // cyan star
  vec3 themeC = vec3(1.0, 0.45, 0.15); // amber ember
  vec3 themeD = vec3(0.3, 1.0, 0.6);   // jade
  vec3 t1 = mix(themeA, themeB, smoothstep(0.25, 0.5, t));
  vec3 t2 = mix(themeB, themeC, smoothstep(0.5, 0.75, t));
  vec3 t3 = mix(themeC, themeD, smoothstep(0.75, 1.0, t));
  vec3 base = mix(mix(t1, t2, smoothstep(0.5, 0.75, t)), t3, smoothstep(0.75, 1.0, t));
  return base * (0.55 + 0.45 * c.r);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.x *= u_resolution.x / u_resolution.y;
  vec2 mouse = u_mouse;
  mouse.x *= u_resolution.x / u_resolution.y;

  vec3 color = vec3(0.0);

  // Nebula backdrop — faint drifting dust that reacts to the swarm
  float dust = fbm(uv * 2.0 + vec2(0.0, u_time * 0.02));
  color += themeColor(u_color_theme, dust * 0.6) * dust * 0.09;

  // Glow at the cursor — a breathing stellar core
  float core = exp(-length(uv - mouse) * 4.0);
  color += themeColor(u_color_theme, 0.15) * core * 0.12 * (0.8 + 0.2 * sin(u_time * 2.0));

  float count = floor(mix(40.0, 160.0, u_particle_count));
  float attract = u_attract_repel < 0.5 ? 1.0 : 0.0;
  float repel = 1.0 - attract;
  float force = mix(0.85, 0.35, attract) + mix(0.0, 0.55, repel);

  for (float i = 0.0; i < 170.0; i++) {
    if (i >= count) break;

    float seed = hash(vec2(i, 7.0));
    float seed2 = hash(vec2(i, 13.0));
    float seed3 = hash(vec2(i, 29.0));

    // Home anchor scattered across the screen
    vec2 home = vec2(hash(vec2(i, 3.0)) * 1.2 + 0.15, hash(vec2(i, 5.0)) * 0.9 + 0.05);

    // Independent orbit phase: radius, angular speed, tilt
    float radius = 0.02 + seed * 0.35;
    float speed = 0.25 + seed2 * 0.9;
    float angle = u_time * speed + seed3 * 6.28318;
    vec2 orbit = vec2(cos(angle) * radius, sin(angle) * radius * (0.6 + seed * 0.7));

    // Slow drift of the home anchor itself
    vec2 drift = vec2(
      noise(vec2(seed * 4.0, u_time * 0.08)) - 0.5,
      noise(vec2(seed2 * 4.0, u_time * 0.08 + 3.7)) - 0.5
    ) * 0.12;

    vec2 rest = home + orbit + drift;
    vec2 toMouse = mouse - rest;
    float dm = length(toMouse);

    // Attract: particles lean toward the cursor. Repel: they lean away.
    float pull = exp(-dm * 1.4) * force * 0.8;
    vec2 dir = toMouse / max(dm, 0.001);
    vec2 pos = rest + dir * pull * mix(0.25, 1.0, seed);

    float d = length(uv - pos);

    // Size modulated by distance to the cursor: swell near the core when
    // attracting, thin out (but glow) when repelled.
    float size = 0.006 + seed * 0.016;
    float distMod = mix(1.0 + exp(-dm * 2.5) * 1.6, 1.0 - exp(-dm * 2.0) * 0.35, repel);
    // Tight stellar core + wide atmospheric halo
    float glow = (exp(-d * d / (size * size * 0.5)) + 0.35 * exp(-d * d / (size * size * 4.0))) * distMod;

    // Exponential trail decay along the orbital tangent
    float tang = angle - 1.5708;
    vec2 trailDir = vec2(cos(tang), sin(tang) * (0.6 + seed * 0.7));
    float steps = floor(mix(2.0, 9.0, u_trail_length));
    for (float s = 1.0; s <= 9.0; s++) {
      if (s > steps) break;
      vec2 tp = pos - trailDir * (s * 0.018 * (0.5 + seed));
      float td = length(uv - tp);
      glow += exp(-td * td / (size * size * 0.9)) * exp(-s * 0.75);
    }

    // Individual phase shifts each particle's color over time
    float hueShift = 0.08 * sin(u_time * 0.5 + seed * 6.28);
    vec3 pColor = themeColor(u_color_theme, fract(seed + hueShift));
    color += glow * pColor * 2.4;
  }

  // Faint starfield sprinkled over the scene
  vec2 starId = floor(uv * 220.0);
  float star = hash(starId + 0.5) > 0.996 ? 0.5 : 0.0;
  color += star * (0.5 + 0.5 * sin(u_time * 2.0 + hash(starId) * 20.0));

  // Tone map softly and add vignette for a cinematic finish
  color = color / (1.0 + color * 0.65);
  float vig = smoothstep(1.6, 0.4, length((uv - vec2(0.5 * u_resolution.x / u_resolution.y, 0.5)) * 1.3));
  gl_FragColor = vec4(color * vig, 1.0);
}
