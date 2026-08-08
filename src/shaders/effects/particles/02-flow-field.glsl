// Aurora flow field — thousands of streamlines tracing a Perlin vector field
// Particles enter from the top edge and step along a domain-warped FBM field.
// Color runs warm -> cool along each streamline; the cursor warps the local field.
#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_density;
uniform float u_noise_scale;
uniform float u_flow_speed;
uniform float u_color_theme; // 0..1 selects from 4 palettes

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm2(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 2; i++) { v += a * noise(p); p *= 2.05; a *= 0.5; }
  return v;
}
float fbm3(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

// Streamline direction: always descending, deflected sideways by the warped field,
// and bent into vortex rings around the cursor.
vec2 fieldDir(vec2 p) {
  vec2 q = p * u_noise_scale;
  q += vec2(0.0, -u_time * u_flow_speed * 0.22);
  float w1 = fbm2(q);
  float w2 = fbm2(q + 11.31);
  vec2 qq = q + vec2(w1, w2) * 1.6;
  float a = fbm3(qq) * 12.5664;

  vec2 toM = p - u_mouse;
  float dm = length(toM);
  float swirl = exp(-dm * dm * 30.0);
  a += swirl * sin(dm * 42.0 - u_time * 4.0) * 3.2; // concentric vortex rings
  a += swirl * 2.4;

  return normalize(vec2(cos(a) * 0.55, -1.0));
}

// Warm -> cool pairs for the four themes
void palette(float t, out vec3 warm, out vec3 cool, out vec3 deep) {
  vec3 wA = vec3(0.45, 0.95, 0.55), cA = vec3(0.55, 0.35, 0.95), dA = vec3(0.03, 0.06, 0.14);
  vec3 wB = vec3(0.25, 0.85, 0.95), cB = vec3(0.15, 0.3, 0.85), dB = vec3(0.02, 0.07, 0.12);
  vec3 wC = vec3(1.0, 0.62, 0.15), cC = vec3(0.95, 0.25, 0.3), dC = vec3(0.1, 0.03, 0.06);
  vec3 wD = vec3(1.0, 0.72, 0.8), cD = vec3(0.75, 0.4, 0.95), dD = vec3(0.08, 0.03, 0.1);
  warm = mix(wA, wB, smoothstep(0.0, 0.33, t));
  warm = mix(warm, wC, smoothstep(0.33, 0.66, t));
  warm = mix(warm, wD, smoothstep(0.66, 1.0, t));
  cool = mix(cA, cB, smoothstep(0.0, 0.33, t));
  cool = mix(cool, cC, smoothstep(0.33, 0.66, t));
  cool = mix(cool, cD, smoothstep(0.66, 1.0, t));
  deep = mix(dA, dB, smoothstep(0.0, 0.33, t));
  deep = mix(deep, dC, smoothstep(0.33, 0.66, t));
  deep = mix(deep, dD, smoothstep(0.66, 1.0, t));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.x *= u_resolution.x / u_resolution.y;
  vec2 mouse = u_mouse;
  mouse.x *= u_resolution.x / u_resolution.y;

  vec3 warm, cool, deep;
  palette(u_color_theme, warm, cool, deep);

  // Deep background with a faint aurora haze
  vec3 color = deep;
  float haze = fbm2(uv * 1.8 + u_time * 0.02) * 0.35;
  color += mix(cool, warm, haze) * haze * 0.12;

  // Cursor halo
  float glow = exp(-length(uv - mouse) * 4.5);
  color += cool * glow * 0.1;

  float count = floor(mix(80.0, 170.0, u_density));
  float aspect = u_resolution.x / u_resolution.y;

  for (float i = 0.0; i < 160.0; i++) {
    if (i >= count) break;

    float seed = hash(vec2(i, 1.0));
    float x0 = seed * aspect; // spawn across the full visible width
    float speedVar = 0.35 + hash(vec2(i, 2.0)) * 0.65;
    float age = fract(u_time * u_flow_speed * 0.07 * speedVar + hash(vec2(i, 3.0)));

    // Cheap vertical cull — the line only exists between the head and the top edge
    float headY = 1.06 - age * 1.22;
    if (uv.y >= headY - 0.05 && uv.y <= 1.12) {
      float steps = age * 6.0;
      float bright = (0.35 + 0.65 * hash(vec2(i, 4.0))) * (0.5 + 0.5 * sin(u_time * 2.0 + seed * 40.0));

      vec2 p = vec2(x0, 1.06 - 0.18 * hash(vec2(i, 8.0))); // staggered entry, folds in the curtain
      float stepLen = 0.16 + 0.14 * hash(vec2(i, 9.0));    // per-particle, breaks row striping
      for (float s = 0.0; s < 6.0; s++) {
        if (s >= steps) break;
        p += fieldDir(p) * stepLen;
        float d = length(uv - p);
        if (d <= 0.12) {
          // Only expensive when this sample can actually reach the pixel
          float prog = s / 6.0;
          vec3 lineColor = mix(warm, cool, prog);
          float radius = 0.006 + 0.014 * (1.0 - prog);
          float body = exp(-d * d / (radius * radius));
          float halo = exp(-d * d / (radius * radius * 6.0)) * 0.22;
          float fade = 0.4 + 0.5 * (1.0 - s / 6.0); // head brighter
          color += lineColor * (body + halo) * bright * fade * 1.7;
        }
      }
    }
  }

  color = color / (1.0 + color * 0.5);
  float vig = smoothstep(1.5, 0.45, length((uv - vec2(0.5 * u_resolution.x / u_resolution.y, 0.5)) * 1.25));
  gl_FragColor = vec4(color * vig, 1.0);
}
