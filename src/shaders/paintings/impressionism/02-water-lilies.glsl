#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_ripple;
uniform float u_splash_radius;
uniform vec3 u_petal_color;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
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
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.x *= u_resolution.x / u_resolution.y;

  // Water base color
  vec3 waterDeep = vec3(0.05, 0.2, 0.3);
  vec3 waterMid = vec3(0.1, 0.35, 0.25);
  vec3 waterShallow = vec3(0.2, 0.45, 0.2);

  // Mouse proximity boosts the ambient ripple field
  float cursorInfluence = exp(-length(uv - u_mouse) * 4.0);
  float ripple1 = sin(uv.x * 20.0 + u_time * 1.2) * cos(uv.y * 15.0 - u_time * 0.8) * u_ripple;
  float ripple2 = sin(uv.x * 12.0 - u_time * 0.6) * cos(uv.y * 18.0 + u_time * 1.0) * u_ripple;
  float ripple = (ripple1 * 0.3 + ripple2 * 0.2) * (1.0 + 2.0 * cursorInfluence);

  // Water depth from noise
  float depth = fbm(uv * 5.0 + ripple + u_time * 0.05);
  vec3 water = mix(waterDeep, waterMid, depth);
  water = mix(water, waterShallow, smoothstep(0.6, 0.8, depth));

  // Light reflections
  float reflection = fbm(vec2(uv.x * 3.0, uv.y * 4.0 + u_time * 0.1)) * 0.4;
  reflection += sin(uv.x * 8.0 + u_time * 0.5) * cos(uv.y * 6.0) * 0.15;
  water += reflection * vec3(0.3, 0.7, 0.5) * 0.3;

  // Click ripples — staggered rings expanding from the cursor
  float ripples = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float cycle = fract(u_time * 0.7 + fi * 0.2);
    vec2 center = u_mouse + vec2(cos(fi * 2.1) * 0.02, sin(fi * 2.7) * 0.02);
    float radius = u_splash_radius * (0.5 + cycle * 4.5);
    float ring = exp(-abs(length(uv - center) - radius) * 26.0);
    ring *= (1.0 - cycle) * u_ripple;
    ripples += ring;
  }
  water += ripples * vec3(0.5, 0.75, 0.55) * 0.35;

  // Lily pads (ellipses) — drifting with the waves
  float lilies = 0.0;
  vec3 lilyColor = vec3(0.15, 0.5, 0.2);
  for (int i = 0; i < 8; i++) {
    vec2 lp = vec2(
      hash(vec2(float(i), 0.0)) * 0.7 + 0.05,
      hash(vec2(float(i), 1.0)) * 0.6 + 0.1
    );
    // Perlin drift, pushed further by the mouse wake
    lp += vec2(
      noise(lp * 3.0 + u_time * 0.15) * 0.05,
      noise(lp * 3.0 + u_time * 0.15 + 7.3) * 0.05
    );
    lp += (u_mouse - vec2(0.5, 0.5)) * u_ripple * 0.02;
    float lr = 0.04 + hash(vec2(float(i), 2.0)) * 0.04;
    float notch = 0.3 + hash(vec2(float(i), 3.0)) * 0.4;
    float la = hash(vec2(float(i), 4.0)) * 6.28;

    vec2 lp_uv = uv - lp;
    float dist = length(lp_uv);
    float angle = atan(lp_uv.y, lp_uv.x) - la;
    float padDist = dist - lr * (1.0 - 0.2 * abs(sin(angle)));
    float pad = 1.0 - smoothstep(-0.005, 0.005, padDist);
    lilies = max(lilies, pad);
  }
  water = mix(water, lilyColor, lilies * 0.5);

  // Flower highlights (petal-tinted dots near lilies)
  float flowers = 0.0;
  for (int i = 0; i < 5; i++) {
    vec2 fp = vec2(
      hash(vec2(float(i), 5.0)) * 0.65 + 0.08,
      hash(vec2(float(i), 6.0)) * 0.5 + 0.15
    );
    fp += vec2(noise(fp * 2.5 + u_time * 0.12) * 0.05, noise(fp * 2.5 + u_time * 0.12 + 3.1) * 0.05);
    float d = length(uv - fp) * 30.0;
    flowers += exp(-d * d) * 0.3;
  }

  vec3 petalColor = u_petal_color * (0.85 + flowers * 0.3);
  water += flowers * petalColor * 0.2;
  water += ripples * petalColor * 0.15;

  // Vignette
  float vignette = 1.0 - length((uv - 0.5) * 1.2) * 0.5;
  water *= smoothstep(0.0, 1.0, vignette);

  gl_FragColor = vec4(water, 1.0);
}
