// CMYK halftone — four screened ink plates (cyan 15°, magenta 75°, yellow 0°,
// black 45°) overprint with selectable dot shape, dot size, screen angle, and
// paper tone; hash fiber grain simulates the paper surface.
#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform sampler2D u_texture;
uniform vec2 u_videoSize;
uniform float u_dot_size;
uniform float u_angle;
uniform float u_dot_shape; // 0 circle, 1 diamond, 2 line
uniform vec3 u_paper_color;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

// Distance from the cell center for the selected dot shape
float cellShape(vec2 p) {
  if (u_dot_shape < 0.5) return length(p);
  if (u_dot_shape < 1.5) return abs(p.x) + abs(p.y);
  return abs(p.x);
}

// Ink coverage 0..1 for one screen plate rotated by `angle` radians
float plate(vec2 uv, float ink, float angle, float cellPx) {
  float c = cos(angle);
  float s = sin(angle);
  vec2 rp = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
  vec2 pos = fract(rp * u_videoSize / cellPx) - 0.5;
  float d = cellShape(pos);
  float r = sqrt(ink) * 0.5;
  return (1.0 - smoothstep(r, r + 0.08, d)) * step(0.015, ink);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_videoSize;
  vec3 tex = texture2D(u_texture, uv).rgb;

  // CMYK separation
  float k = 1.0 - max(tex.r, max(tex.g, tex.b));
  float inv = 1.0 - k + 0.0001;
  float c = clamp((1.0 - tex.r - k) / inv, 0.0, 1.0);
  float m = clamp((1.0 - tex.g - k) / inv, 0.0, 1.0);
  float y = clamp((1.0 - tex.b - k) / inv, 0.0, 1.0);

  float cellPx = max(1.0, u_dot_size * 3.5);
  float a = u_angle * 3.14159265 / 180.0;

  float cDot = plate(uv, c, a + 15.0 * 3.14159265 / 180.0, cellPx);
  float mDot = plate(uv, m, a + 75.0 * 3.14159265 / 180.0, cellPx);
  float yDot = plate(uv, y, a, cellPx);
  float kDot = plate(uv, k, a + 45.0 * 3.14159265 / 180.0, cellPx);

  // Overprint the four inks on the paper
  vec3 col = u_paper_color;
  col = mix(col, vec3(0.0, 0.55, 0.75), cDot);
  col = mix(col, vec3(0.85, 0.15, 0.55), mDot);
  col = mix(col, vec3(0.95, 0.8, 0.1), yDot);
  col = mix(col, vec3(0.15), kDot);

  // Paper fiber: coarse hash grain plus long horizontal fiber streaks
  col += hash(uv * 500.0) * 0.03;
  col += (noise(vec2(uv.x * 240.0, uv.y * 9.0)) - 0.5) * 0.05;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
