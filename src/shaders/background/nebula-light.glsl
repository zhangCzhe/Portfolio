// "Morning Marble" — museum entrance background
// Multi-layer FBM with vein-like domain warping, paper-tone palette.
#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 6; i++) {
    value += amplitude * noise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  uv *= 1.8;

  // Very slow drift
  float drift = u_time * 0.015;

  // Domain warping for vein-like marble patterns
  vec2 q = vec2(
    fbm(uv + vec2(0.5, 2.0) * drift),
    fbm(uv + vec2(2.0, 0.5) * drift)
  );

  vec2 r = vec2(
    fbm(uv + 1.5 * q + vec2(1.7, 9.2) * drift),
    fbm(uv + 1.5 * q + vec2(8.3, 2.8) * drift)
  );

  float marble = fbm(uv + 2.0 * r);

  // Soften and remap for subtle paper texture
  marble = smoothstep(0.15, 0.85, marble);

  // Paper-tone palette: ivory white base (#f7f4ee) with warm gray veins
  vec3 ivory = vec3(0.969, 0.957, 0.933);     // #f7f4ee
  vec3 warmGray = vec3(0.875, 0.851, 0.804);   // #dfd9cd
  vec3 veinGold = vec3(0.831, 0.741, 0.631);   // #d4bda1
  vec3 deepVein = vec3(0.765, 0.710, 0.663);   // #c3b5a9

  // Blend layers based on marble value
  float v1 = smoothstep(0.35, 0.55, marble);
  float v2 = smoothstep(0.45, 0.6, marble);
  float v3 = smoothstep(0.5, 0.65, marble);

  vec3 col = mix(ivory, warmGray, v1 * 0.4);
  col = mix(col, veinGold, v2 * 0.25);
  col = mix(col, deepVein, v3 * 0.15);

  // Subtle grain texture overlay
  float grain = hash(uv * 800.0 + drift * 10.0) * 0.015;
  col += grain;

  gl_FragColor = vec4(col, 1.0);
}
