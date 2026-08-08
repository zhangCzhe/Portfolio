// Ecosystem evolution — multi-species cellular automaton
// Three species drift through a continuous life field; each cell samples its
// 8 neighbors every frame and applies species-specific survival / birth rules.
// The cursor paints new cells; pulsing rings seed them like clicks.
#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_grid_scale;
uniform float u_evolution_speed;
uniform float u_species_colors; // cycles 3 color sets

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

// Continuous life field for one species — different frequency + phase per species
float lifeField(vec2 cell, float freq, float phase) {
  vec2 q = cell * freq + vec2(phase, phase * 2.7);
  q += u_time * u_evolution_speed * 0.05;
  return noise(q);
}

// Sum of alive neighbors for a species
float neighborCount(vec2 cell, float freq, float phase, float th) {
  float sum = 0.0;
  for (int dx = -1; dx <= 1; dx++) {
    for (int dy = -1; dy <= 1; dy++) {
      if (dx != 0 || dy != 0) {
        sum += step(th, lifeField(cell + vec2(float(dx), float(dy)), freq, phase));
      }
    }
  }
  return sum;
}

// Species-specific survival rules
float survive(float n) { return smoothstep(1.5, 2.5, n) * (1.0 - smoothstep(3.5, 4.5, n)); }
float born(float n) { return smoothstep(2.5, 3.5, n) * (1.0 - smoothstep(3.5, 4.5, n)); }
float sparseSurvive(float n) { return smoothstep(0.5, 1.5, n) * (1.0 - smoothstep(2.5, 3.5, n)); }
float crowdedBorn(float n) { return smoothstep(1.5, 2.5, n) * (1.0 - smoothstep(3.5, 4.5, n)); }
float crowdSurvive(float n) { return smoothstep(2.5, 3.5, n) * (1.0 - smoothstep(4.5, 5.5, n)); }

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  uv.x *= aspect;
  vec2 mouse = u_mouse;
  mouse.x *= aspect;

  float grid = mix(44.0, 130.0, u_grid_scale);
  vec2 cell = floor(uv * grid);
  vec2 cellUv = fract(uv * grid);

  // ── Seeding: cursor paints, pulsing rings "click" new cells ──
  float dm = length(cell - mouse * grid);
  float paint = exp(-dm * 0.55) * 1.1;
  float clicks = 0.0;
  for (float i = 0.0; i < 3.0; i++) {
    float cycle = fract(u_time * u_evolution_speed * 0.45 + i * 0.33);
    float radius = 1.2 + cycle * 7.0;
    clicks += exp(-(dm - radius) * (dm - radius) * 0.35) * (1.0 - cycle);
  }
  float seed = paint + clicks * 2.2;

  // ── Three species, three life fields, three rule sets ──
  float th = 0.56;
  float effTh = th - seed;

  // Species 0 — "grasses": classic Conway (survive 2-3, born 3)
  float f0 = lifeField(cell, 1.0, 0.0);
  float n0 = neighborCount(cell, 1.0, 0.0, effTh);
  float a0 = step(effTh, f0);
  float s0 = mix(born(n0), survive(n0), a0);

  // Species 1 — "wanderers": sparse (survive 1-2, born 3)
  float f1 = lifeField(cell, 0.62, 4.13);
  float n1 = neighborCount(cell, 0.62, 4.13, effTh);
  float a1 = step(effTh, f1);
  float s1 = mix(born(n1), sparseSurvive(n1), a1);

  // Species 2 — "colonizers": crowd together (survive 3-4, born 2)
  float f2 = lifeField(cell, 1.7, 8.77);
  float n2 = neighborCount(cell, 1.7, 8.77, effTh);
  float a2 = step(effTh, f2);
  float s2 = mix(crowdedBorn(n2), crowdSurvive(n2), a2);

  // ── Color sets cycled by u_species_colors ──
  float t = fract(u_species_colors);
  vec3 bg = mix(vec3(0.03, 0.07, 0.045), vec3(0.02, 0.05, 0.12), smoothstep(0.33, 0.66, t));
  bg = mix(bg, vec3(0.045, 0.02, 0.09), smoothstep(0.66, 1.0, t));
  vec3 c0 = mix(vec3(0.3, 0.75, 0.35), vec3(0.25, 0.85, 0.95), smoothstep(0.33, 0.66, t));
  c0 = mix(c0, vec3(0.85, 0.35, 1.0), smoothstep(0.66, 1.0, t));
  vec3 c1 = mix(vec3(0.85, 0.6, 0.2), vec3(0.35, 0.45, 1.0), smoothstep(0.33, 0.66, t));
  c1 = mix(c1, vec3(0.2, 1.0, 0.6), smoothstep(0.66, 1.0, t));
  vec3 c2 = mix(vec3(0.62, 0.38, 0.22), vec3(0.95, 0.5, 0.62), smoothstep(0.33, 0.66, t));
  c2 = mix(c2, vec3(1.0, 0.92, 0.3), smoothstep(0.66, 1.0, t));

  // ── Render cells with soft rounded interiors ──
  float cellMask = smoothstep(0.0, 0.06, cellUv.x) * smoothstep(0.0, 0.06, cellUv.y) *
                   smoothstep(0.0, 0.06, 1.0 - cellUv.x) * smoothstep(0.0, 0.06, 1.0 - cellUv.y);

  float alive = clamp(s0 * 0.9 + s1 * 0.95 + s2 * 1.0, 0.0, 1.0);
  vec3 speciesColor = c0 * s0 + c1 * s1 + c2 * s2;
  vec3 color = mix(bg, bg * 0.5, alive * cellMask * 0.25);

  vec3 cellCol = speciesColor * alive * (0.65 + 0.35 * cellUv.x * cellUv.y);
  color = mix(color, cellCol, alive * cellMask * 0.85);

  // Glow for the living — species tinted, brighter on the frontier
  float core = exp(-length(cellUv - 0.5) * 2.6);
  float glowAmt = alive * cellMask * core * (0.55 + 0.45 * s2);
  color += speciesColor * glowAmt * 0.8;

  // Fine grid lines with a faint pulse
  float line = min(cellUv.x, 1.0 - cellUv.x);
  line = min(line, min(cellUv.y, 1.0 - cellUv.y));
  float gridLine = 1.0 - smoothstep(0.0, 0.018, line);
  color = mix(color, bg * 1.35, gridLine * 0.16 * (0.7 + 0.3 * sin(u_time * u_evolution_speed + cell.x + cell.y)));

  // Cursor aura — painting feel
  float aura = exp(-length(uv - mouse) * 3.2);
  color += speciesColor * aura * 0.05;

  float vig = smoothstep(1.5, 0.45, length((uv - vec2(0.5 * u_resolution.x / u_resolution.y, 0.5)) * 1.25));
  gl_FragColor = vec4(color * vig, 1.0);
}
