// Cyberpunk glitch — per-row RGB channel split, CRT scanlines, median-filtered
// pixel-sort rows, and a hue cycle that shifts down the frame.
#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform sampler2D u_texture;
uniform vec2 u_videoSize;
uniform float u_time;
uniform float u_intensity;
uniform float u_scanline_amount;
uniform float u_hue_shift;
uniform float u_glitch_density;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float median3(float a, float b, float c) {
  return max(min(a, b), min(max(a, b), c));
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.bg, K.xy), step(c.b, c.r));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.g));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_videoSize;

  // ── Random rows of RGB channel split ──
  float lines = max(1.0, u_glitch_density * 24.0);
  float band = hash(vec2(floor(uv.y * lines), floor(u_time * 8.0)));
  float shift = (band - 0.5) * 2.0 * u_intensity * 0.06;
  vec3 col = vec3(
    texture2D(u_texture, vec2(uv.x + shift * 2.0, uv.y)).r,
    texture2D(u_texture, uv).g,
    texture2D(u_texture, vec2(uv.x - shift * 1.5, uv.y)).b
  );

  // ── Pixel-sort rows: random rows shear and median-filter along x ──
  float sortSeed = hash(vec2(floor(uv.y * 36.0), floor(u_time * 4.0) + 23.0));
  float isSort = step(0.84, sortSeed);
  vec2 suv = vec2(uv.x + (sortSeed - 0.5) * u_intensity * 0.18, uv.y);
  vec3 sa = texture2D(u_texture, vec2(suv.x - 3.0 / u_videoSize.x, suv.y)).rgb;
  vec3 sb = texture2D(u_texture, suv).rgb;
  vec3 sc = texture2D(u_texture, vec2(suv.x + 3.0 / u_videoSize.x, suv.y)).rgb;
  vec3 sorted = vec3(
    median3(sa.r, sb.r, sc.r),
    median3(sa.g, sb.g, sc.g),
    median3(sa.b, sb.b, sc.b)
  );
  col = mix(col, sorted, isSort);

  // ── CRT scanlines ──
  col *= 1.0 + sin(uv.y * u_videoSize.y * 0.5) * 0.03 * u_scanline_amount * 1.2;

  // ── Hue cycling down the frame ──
  vec3 hsv = rgb2hsv(col);
  hsv.x = fract(hsv.x + u_hue_shift * uv.y);
  col = hsv2rgb(hsv);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
