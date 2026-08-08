// Sepia time capsule — a full sepia matrix, drifting film grain, sparse
// vertical scratches, a warm light leak bleeding in from the edges, and
// desaturated corners for an aged-photo feel.
#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform sampler2D u_texture;
uniform vec2 u_videoSize;
uniform float u_time;
uniform float u_strength;
uniform float u_grain;
uniform float u_vignette;
uniform float u_scratch_amount;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 uv = gl_FragCoord.xy / u_videoSize;
  vec3 tex = texture2D(u_texture, uv).rgb;

  // Full sepia matrix transform, blended by strength
  vec3 sepia = vec3(
    dot(tex, vec3(0.393, 0.769, 0.189)),
    dot(tex, vec3(0.349, 0.686, 0.168)),
    dot(tex, vec3(0.272, 0.534, 0.131))
  );
  vec3 col = mix(tex, sepia, u_strength);

  // ── Film scratches: sparse short vertical streaks on random bands ──
  // rowNoise (hash of the row index) tears the streak into uneven fragments.
  float band = floor(uv.y * u_videoSize.y / 5.0);
  float bandSeed = hash(vec2(band, 3.7));
  float scratchX = fract(bandSeed * 17.31) * u_videoSize.x;
  float dx = abs(uv.x * u_videoSize.x - scratchX);
  float rowNoise = fract(uv.y * u_videoSize.y + hash(vec2(floor(uv.y * 200.0), 0.7)) * 100.0);
  float scratch = step(0.975, bandSeed) * exp(-dx * dx * 2.5) * (0.5 + 0.6 * rowNoise);
  col += vec3(0.9, 0.87, 0.78) * scratch * u_scratch_amount * 0.4;

  // ── Light leak: warm glow bleeding in from the top edge ──
  float leakTop = smoothstep(0.4, 0.02, uv.y);
  float leakRight = smoothstep(0.6, 0.0, uv.x - 0.55) * smoothstep(0.2, 0.6, uv.y);
  float leakNoise = 0.7 + 0.6 * hash(vec2(floor(uv.y * 40.0), 1.3));
  col += vec3(1.0, 0.5, 0.15) * max(leakTop, leakRight) * 0.3 * leakNoise;

  // ── Corner fade: desaturate toward the edges like a faded print ──
  float corner = length((uv - 0.5) * vec2(u_videoSize.x / u_videoSize.y, 1.0)) * 1.35;
  float fade = smoothstep(1.05, 0.5, corner);
  col = mix(col, vec3(dot(col, vec3(0.299, 0.587, 0.114))), fade * 0.75);

  // ── Film grain: animated per-pixel noise ──
  float grain = hash(gl_FragCoord.xy + vec2(fract(u_time * 21.0) * 137.0, 0.0)) - 0.5;
  col += grain * u_grain * 0.12;

  // ── Vignette ──
  float vigDist = length(uv - 0.5) * 1.4;
  col *= 1.0 - smoothstep(0.35, 0.95, vigDist) * u_vignette;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
