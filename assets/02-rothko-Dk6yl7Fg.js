var e=`#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_shift;

float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.x *= u_resolution.x / u_resolution.y;

  // Rothko-style color fields with soft, blurred boundaries

  // Field 1: Deep red-orange (bottom)
  float f1 = smoothstep(0.55 + u_shift, 0.7 + u_shift, uv.y + noise(uv * 60.0) * 0.03);
  vec3 c1 = vec3(0.75, 0.15, 0.08);

  // Field 2: Dark maroon/black (top)
  float f2 = smoothstep(0.15 + u_shift, 0.3 + u_shift, uv.y + noise(uv * 50.0) * 0.03);
  vec3 c2 = vec3(0.18, 0.06, 0.08);

  // Field 3: Warm orange band (middle)
  float f3 = smoothstep(0.35 + u_shift, 0.5 + u_shift, uv.y + noise(uv * 55.0) * 0.04);
  f3 *= 1.0 - smoothstep(0.55 + u_shift, 0.65 + u_shift, uv.y + noise(uv * 55.0) * 0.04);
  vec3 c3 = vec3(0.85, 0.4, 0.15);

  // Background warm tone
  vec3 bg = vec3(0.82, 0.35, 0.18);

  vec3 color = bg;
  color = mix(color, c1, f1);
  color = mix(color, c2, f2);
  color = mix(color, c3, f3 * 0.8);

  // Add brush-like texture to field boundaries
  float texture = noise(uv * 100.0) * 0.04;
  float edgeNoise = noise(uv * 200.0 + 1.0) * 0.02;
  color += texture * (f1 + f2) * 0.5;
  color += edgeNoise;

  // Canvas grain
  float grain = hash(uv * 500.0 + fract(u_time * 0.01)) * 0.015;
  color += grain;

  // Subtle vignette
  color *= 1.0 - length((uv - 0.5) * 0.5) * 0.2;

  gl_FragColor = vec4(color, 1.0);
}
`;export{e as default};