#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_coverage;

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
  for (int i = 0; i < 5; i++) {
    v += a * noise(p * f);
    f *= 2.1;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.x *= u_resolution.x / u_resolution.y;

  float cloud = fbm(uv * 3.0 + u_time * 0.1);
  cloud = smoothstep(u_coverage, u_coverage + 0.3, cloud);

  vec3 skyTop = vec3(0.1, 0.3, 0.7);
  vec3 skyBottom = vec3(0.6, 0.8, 1.0);
  vec3 sky = mix(skyTop, skyBottom, uv.y);

  vec3 color = mix(sky, vec3(1.0), cloud * 0.85);

  gl_FragColor = vec4(color, 1.0);
}
