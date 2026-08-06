#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;

// Simplex-like noise based on sin combinations
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

  // Time-warped coordinates
  float t = u_time * 0.15;

  // Layered flowing nebula
  vec2 q1 = centered * 2.0 + vec2(sin(t * 0.3), cos(t * 0.4)) * 0.5;
  float f1 = fbm(q1 * 3.0 + t * 0.2);

  vec2 q2 = centered * 2.5 + vec2(cos(t * 0.5), sin(t * 0.35)) * 0.6;
  float f2 = fbm(q2 * 4.0 - t * 0.15);

  // Color palettes
  vec3 col1 = vec3(0.1, 0.2, 0.6); // deep blue
  vec3 col2 = vec3(0.4, 0.1, 0.6); // purple
  vec3 col3 = vec3(0.0, 0.5, 0.7); // teal

  // Mix colors based on noise layers
  vec3 color = mix(col1, col2, f1);
  color = mix(color, col3, f2 * 0.6);
  color += fbm(centered * 5.0 + t * 0.1) * 0.15;

  // Vignette
  float vignette = 1.0 - length(centered) * 0.7;
  vignette = smoothstep(0.0, 1.0, vignette);

  // Soft glow in center
  float glow = exp(-length(centered) * 2.5) * 0.3;

  color *= vignette;
  color += glow * vec3(0.2, 0.4, 0.8);

  // Subtle grain
  float grain = hash(uv + fract(u_time * 0.01)) * 0.03;
  color += grain;

  gl_FragColor = vec4(color, 1.0);
}
