var e=`#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float randomColor(vec2 p) {
  return floor(hash(p) * 3.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.x *= u_resolution.x / u_resolution.y;

  // Scale to artboard
  uv = uv * 1.2 - 0.1;

  vec3 color = vec3(0.96, 0.96, 0.94); // warm white
  vec3 black = vec3(0.05, 0.05, 0.08);
  vec3 red = vec3(0.85, 0.1, 0.1);
  vec3 blue = vec3(0.05, 0.15, 0.7);
  vec3 yellow = vec3(0.9, 0.8, 0.1);

  float lineW = 0.008;
  float thickLineW = 0.014;

  // Grid lines
  float h1 = 0.22, h2 = 0.58, h3 = 0.85;
  float v1 = 0.18, v2 = 0.55, v3 = 0.8;

  // Check which cell we're in
  float cx = uv.x, cy = uv.y;

  // Cell (v1-v2, 0-h1): Red rectangle
  if (cx > v2 && cx < v3 && cy > 0.0 && cy < h1) {
    color = mix(color, red, 0.92);
  }
  // Cell (v1-v2, h1-h2): Blue rectangle
  if (cx > v1 && cx < v2 && cy > h1 && cy < h2) {
    color = mix(color, blue, 0.92);
  }
  // Cell (v2-v3, h2-h3): Yellow rectangle
  if (cx > v2 && cx < v3 && cy > h2 && cy < h3) {
    color = mix(color, yellow, 0.92);
  }
  // Cell (0-v1, h2-h3): small yellow accent
  if (cx > 0.0 && cx < v1 && cy > h2 && cy < h3) {
    color = mix(color, yellow, 0.85);
  }

  // Draw grid lines
  float lines = 0.0;

  // Horizontal lines
  for (int i = 0; i < 4; i++) {
    float h = float(i) * 0.25 + 0.15;
    if (i == 1) h = h2;
    if (i == 2) h = h3;
    if (i == 3) h = 0.96;
    if (i == 0) h = h1;
    float lw = (i == 2) ? thickLineW : lineW;
    lines = max(lines, 1.0 - smoothstep(0.0, lw, abs(cy - h)));
  }

  // Vertical lines — GLSL ES 1.00 compatible array init
  float vl[4];
  vl[0] = v1; vl[1] = v2; vl[2] = v3; vl[3] = 0.95;
  for (int i = 0; i < 4; i++) {
    float lw = lineW;
    lines = max(lines, 1.0 - smoothstep(0.0, lw, abs(cx - vl[i])));
  }

  // Borders
  lines = max(lines, 1.0 - smoothstep(0.0, thickLineW, abs(cx - 0.0)));
  lines = max(lines, 1.0 - smoothstep(0.0, thickLineW, abs(cy - 0.02)));

  color = mix(color, black, lines);

  // Subtle texture
  float grain = hash(uv * 400.0 + fract(u_time * 0.1)) * 0.03;
  color += grain;

  gl_FragColor = vec4(color, 1.0);
}
`;export{e as default};