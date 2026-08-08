// src/shaders/paintings/surrealism/01-dali-melting.glsl
// Dali — The Persistence of Memory (melting clocks)
#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_melt_amount;
uniform vec3 u_clock_color;
uniform vec3 u_horizon_color;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x),
             mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 d = abs(p) - b + r;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  vec2 mouse = u_mouse * 2.0 - 1.0;

  // Horizon and desert ground
  float horizon = -0.25;
  float ground = smoothstep(horizon - 0.02, horizon, uv.y);
  vec3 sky = mix(vec3(0.85, 0.75, 0.55), vec3(0.95, 0.9, 0.8), uv.y * 0.5 + 0.5);
  vec3 groundCol = mix(vec3(0.6, 0.45, 0.3), u_horizon_color, 0.3);
  vec3 col = mix(sky, groundCol, ground);

  // Melting clock (rounded rectangle that droops)
  vec2 clockCenter = vec2(0.15, 0.08);
  // Melting distortion: noise field + mouse influence pushes the shape down
  float meltFactor = u_melt_amount * (0.8 + 0.4 * mouse.y);
  float clockDist = sdRoundedBox(uv - clockCenter, vec2(0.25, 0.08), 0.02);
  float melt = fbm((uv + vec2(0.3, 0.1)) * 6.0 + u_time * 0.1) * meltFactor;
  clockDist -= melt * 0.08;

  if (clockDist < 0.0) {
    col = mix(u_clock_color, vec3(0.95, 0.9, 0.8), -clockDist * 3.0);
  }

  // Second smaller clock in background
  vec2 clock2 = vec2(-0.25, 0.02);
  float d2 = sdRoundedBox(uv - clock2, vec2(0.15, 0.05), 0.01);
  float melt2 = fbm((uv + vec2(0.5, 0.8)) * 5.0 + u_time * 0.15) * meltFactor * 0.7;
  d2 -= melt2 * 0.05;
  if (d2 < 0.0) {
    col = mix(col, u_clock_color, 0.7);
  }

  gl_FragColor = vec4(col, 1.0);
}
