// src/shaders/effects/reaction/02-fractal-flame.glsl
#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_flame_height;
uniform float u_turbulence;
uniform float u_smoke_amount;
uniform float u_wind;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x),
             mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 mouse = u_mouse;

  // Flame base center follows mouse X
  float flameCenter = mouse.x * 0.6 + 0.5;
  uv.x += (flameCenter - 0.5) * 0.3;

  // Wind pushes flame sideways
  uv.x += u_wind * uv.y * uv.y;

  // Vertical flame profile
  float flameShape = 1.0 - uv.y / u_flame_height;
  flameShape = clamp(flameShape, 0.0, 1.0);

  // Width narrows toward top (teardrop shape)
  float widthAtY = 0.12 + flameShape * 0.08;
  float distFromCenter = abs(uv.x - 0.5);
  float inFlame = smoothstep(widthAtY, widthAtY - 0.03, distFromCenter);

  // Turbulence distortion (heat shimmer)
  float turb = fbm(uv * vec2(12.0, 8.0) + u_time * 0.3) * u_turbulence * flameShape;
  inFlame += turb * 0.08;

  inFlame = clamp(inFlame, 0.0, 1.0);

  // Layered fractal detail
  float detail = fbm(uv * vec2(20.0, 15.0) + u_time * 0.5 + turb * 3.0) * flameShape;
  float core = smoothstep(0.0, 0.4, flameShape) * (1.0 - distFromCenter / 0.05);

  // Color: bottom = deep red, middle = orange, top = yellow/white
  vec3 innerColor = vec3(1.0, 0.95, 0.7);
  vec3 midColor = vec3(1.0, 0.4, 0.05);
  vec3 outerColor = vec3(0.7, 0.1, 0.0);

  float colorT = flameShape; // 0 at top, 1 at bottom
  colorT += detail * 0.3;
  vec3 flameCol = mix(innerColor, midColor, smoothstep(0.3, 0.6, colorT));
  flameCol = mix(flameCol, outerColor, smoothstep(0.6, 0.9, colorT));
  flameCol *= 0.8 + core * 0.4;

  // Smoke above flame
  float smoke = (uv.y > u_flame_height) ?
    fbm(uv * 5.0 + u_time * 0.2 + vec2(u_wind * uv.y, 0.0)) * u_smoke_amount * smoothstep(u_flame_height, 1.0, uv.y) : 0.0;

  vec3 bg = vec3(0.02, 0.01, 0.03);
  vec3 col = mix(bg, flameCol, inFlame);
  col = mix(col, vec3(0.1, 0.08, 0.06), smoke);

  gl_FragColor = vec4(col, 1.0);
}
