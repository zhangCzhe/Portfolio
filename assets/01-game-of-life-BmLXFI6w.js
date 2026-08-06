var e=`#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_scale;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.x *= u_resolution.x / u_resolution.y;

  // Cellular automata pattern approximated in real-time
  // Each cell is seeded by hash and evolves over time

  float scale = 30.0 + u_scale * 30.0;
  vec2 cell = floor(uv * scale) / scale;
  vec2 gv = fract(uv * scale);

  // Cell state determined by multiple factors
  float seed = hash(cell);
  float pattern = seed;

  // Time-based evolution (cyclic)
  float cycle = sin(u_time * 0.5 + seed * 6.28) * 0.5 + 0.5;
  pattern = mix(pattern, cycle, 0.5);

  // Neighbor influence
  float neighbors = 0.0;
  for (int dx = -1; dx <= 1; dx++) {
    for (int dy = -1; dy <= 1; dy++) {
      if (dx == 0 && dy == 0) continue;
      vec2 nc = cell + vec2(float(dx), float(dy)) / scale;
      neighbors += hash(nc);
    }
  }
  neighbors /= 8.0;

  // Conway-like rule simulation
  float alive = step(0.4, pattern);
  float neighborAlive = step(0.5, neighbors);
  float nextState;

  if (alive > 0.5) {
    // Cell is alive: survives with 2-3 neighbors, dies otherwise
    float count = neighborAlive * 3.0 + hash(cell + 0.001) * 2.0;
    nextState = step(0.3, count) * step(0.1, 1.0 - abs(count - 2.5));
  } else {
    // Cell is dead: becomes alive with exactly 3 neighbors
    nextState = step(0.6, neighborAlive + hash(cell + u_time * 0.1) * 0.3);
  }

  // Smooth inside cells
  float cellAlive = mix(pattern, nextState, 0.5 + 0.5 * sin(u_time * 0.3 + hash(cell) * 10.0));
  float soft = smoothstep(0.05, 0.1, gv.x) * smoothstep(0.05, 0.1, gv.y) *
               smoothstep(0.05, 0.1, 1.0 - gv.x) * smoothstep(0.05, 0.1, 1.0 - gv.y);

  vec3 deadColor = vec3(0.04, 0.04, 0.1);
  vec3 aliveColor = vec3(0.2, 0.6, 0.8);
  vec3 borderColor = vec3(0.05, 0.15, 0.3);

  float state = step(0.5, cellAlive);
  vec3 color = mix(borderColor, deadColor, soft);
  color = mix(color, aliveColor, state * soft * 0.7);

  // Glow on alive cells
  float glow = state * exp(-length(gv - 0.5) * 2.0) * 0.3;
  color += glow * vec3(0.4, 0.7, 1.0);

  gl_FragColor = vec4(color, 1.0);
}
`;export{e as default};