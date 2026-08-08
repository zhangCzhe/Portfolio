// Multi-style edge detection — Sobel 8-neighbor with four render styles:
// pencil sketch, ink line, neon tube, and chalk on a slate board.
#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform sampler2D u_texture;
uniform vec2 u_videoSize;
uniform float u_threshold;
uniform vec3 u_line_color;
uniform float u_bg_alpha;
uniform float u_style; // 0 pencil, 1 ink, 2 neon, 3 chalk

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float lumAt(vec2 p) {
  return dot(texture2D(u_texture, p).rgb, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_videoSize;
  vec2 pixel = 1.0 / u_videoSize;

  // Sobel 8-neighbor operator on luminance
  float tl = lumAt(uv + pixel * vec2(-1.0, 1.0));
  float t = lumAt(uv + pixel * vec2(0.0, 1.0));
  float tr = lumAt(uv + pixel * vec2(1.0, 1.0));
  float l = lumAt(uv + pixel * vec2(-1.0, 0.0));
  float r = lumAt(uv + pixel * vec2(1.0, 0.0));
  float bl = lumAt(uv + pixel * vec2(-1.0, -1.0));
  float b = lumAt(uv + pixel * vec2(0.0, -1.0));
  float br = lumAt(uv + pixel * vec2(1.0, -1.0));

  float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
  float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
  float edge = smoothstep(u_threshold * 0.55, u_threshold * 1.3, sqrt(gx * gx + gy * gy));

  vec3 tex = texture2D(u_texture, uv).rgb;
  vec3 col = tex;

  if (u_style < 0.5) {
    // Pencil — graphite shading with uneven stroke pressure
    float stroke = noise(uv * u_videoSize * 0.5);
    float shade = 0.9 - edge * (0.55 + 0.35 * stroke);
    float tooth = 0.94 + 0.12 * (hash(floor(uv * u_videoSize * 0.8)) - 0.5);
    col = vec3(shade * tooth);
  } else if (u_style < 1.5) {
    // Ink — crisp colored line over white paper (or live video via u_bg_alpha)
    float line = smoothstep(0.4, 0.62, edge);
    vec3 bg = mix(tex, vec3(1.0), u_bg_alpha);
    col = mix(bg, u_line_color, line);
  } else if (u_style < 2.5) {
    // Neon — glowing line color on a dimmed background
    vec3 bg = tex * 0.16 + 0.03;
    col = bg + u_line_color * (edge * 0.35 + edge * edge * 0.9);
  } else {
    // Chalk — noise-broken chalk lines on a dark slate board
    vec3 board = vec3(0.13, 0.17, 0.15);
    float chalkMask = smoothstep(0.2, 0.75, edge * (0.55 + 0.7 * noise(uv * u_videoSize * 0.4)));
    float chalkGrain = 0.85 + 0.3 * (hash(floor(uv * u_videoSize * 0.6)) - 0.5);
    col = mix(board, vec3(0.93, 0.91, 0.87) * chalkGrain, chalkMask);
  }

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
