#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_scale;
uniform float u_octaves;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float valueNoise(vec2 p) {
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
  float v = 0.0;
  float a = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 6; i++) {
    if (float(i) >= u_octaves) break;
    v += a * valueNoise(p * freq);
    freq *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  uv *= u_scale;

  float n = fbm(uv + u_time * 0.2);

  vec3 a = vec3(0.05, 0.1, 0.3);
  vec3 b = vec3(0.2, 0.5, 0.9);
  vec3 c = vec3(1.0, 0.9, 0.6);
  vec3 color = mix(a, b, n);
  color = mix(color, c, smoothstep(0.5, 0.8, n));

  gl_FragColor = vec4(color, 1.0);
}
