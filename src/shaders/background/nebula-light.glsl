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

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 centered = uv - 0.5;

  float t = u_time * 0.15;

  vec2 q1 = centered * 2.0 + vec2(sin(t * 0.3), cos(t * 0.4)) * 0.5;
  float f1 = fbm(q1 * 3.0 + t * 0.2);

  vec2 q2 = centered * 2.5 + vec2(cos(t * 0.5), sin(t * 0.35)) * 0.6;
  float f2 = fbm(q2 * 4.0 - t * 0.15);

  // 纸色系调色板
  vec3 paper = vec3(0.969, 0.957, 0.933); // #f7f4ee
  vec3 cream = vec3(0.925, 0.906, 0.863); // 稍深纸色
  vec3 brass = vec3(0.541, 0.427, 0.231); // #8a6d3b
  vec3 sage = vec3(0.620, 0.663, 0.596);  // 灰绿晕染

  vec3 color = mix(paper, cream, f1);
  color = mix(color, brass, f2 * 0.18);
  color = mix(color, sage, fbm(centered * 5.0 + t * 0.1) * 0.12);

  // 柔和纸面暗角（压暗而非压黑）
  float vignette = 1.0 - length(centered) * 0.5;
  color *= mix(0.92, 1.0, smoothstep(0.0, 1.0, vignette));

  // 细腻纸纹
  float grain = hash(uv + fract(u_time * 0.01)) * 0.02;
  color += grain;

  gl_FragColor = vec4(color, 1.0);
}
