#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_warp;

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
  float v = 0.0, a = 0.5, f = 1.0;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p * f);
    f *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  uv *= 2.5;

  // Domain warping: displace coordinates by noise
  vec2 q = vec2(
    fbm(uv + vec2(0.0, 1.0) * u_time * 0.1),
    fbm(uv + vec2(1.0, 2.0) * u_time * 0.1)
  );

  vec2 r = vec2(
    fbm(uv + u_warp * q + vec2(1.7, 9.2) + 0.15 * u_time),
    fbm(uv + u_warp * q + vec2(8.3, 2.8) + 0.12 * u_time)
  );

  float result = fbm(uv + u_warp * r);

  vec3 colA = vec3(0.05, 0.08, 0.25);
  vec3 colB = vec3(0.1, 0.4, 0.7);
  vec3 colC = vec3(0.8, 0.5, 0.9);
  vec3 color = mix(colA, colB, result);
  color = mix(color, colC, smoothstep(0.55, 0.8, result));

  gl_FragColor = vec4(color, 1.0);
}
