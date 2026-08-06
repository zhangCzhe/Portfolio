#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_viscosity;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5, f = 1.0;
  for (int i = 0; i < 4; i++) { v += a * noise(p*f); f *= 2.1; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.x *= u_resolution.x / u_resolution.y;

  // Simulated ink drop in water
  // Multiple expanding circular fronts with noise perturbation

  float ink1 = 0.0;
  float ink2 = 0.0;

  // Primary ink drops from mouse position
  for (float i = 0.0; i < 4.0; i++) {
    float delay = i * 2.0;
    float age = max(u_time - delay, 0.0);
    float radius = age * 0.3 * u_viscosity;
    float fade = exp(-age * 0.4);

    float d = length(uv - u_mouse);
    float front = abs(d - radius);
    float smooth = 2.0 / (radius + 0.5);
    float ring = exp(-front * front * smooth * 50.0) * fade * 0.5;

    // Add noise perturbation to the ring
    float pert = noise(uv * 20.0 + i) * 0.03;
    ring *= 1.0 + pert * 10.0;

    ink1 += ring;
  }

  // Turbulent background diffusion
  vec2 q = uv - u_mouse;
  float dist = length(q) * 3.0;
  float turbulence = fbm(uv * 5.0 + u_time * 0.1) * 0.8;
  turbulence *= exp(-dist * 1.5);

  vec3 waterColor = vec3(0.05, 0.05, 0.1);
  vec3 inkColor = vec3(0.05, 0.15, 0.4);
  vec3 inkEdge = vec3(0.15, 0.35, 0.7);

  vec3 color = mix(waterColor, inkColor, turbulence);
  color = mix(color, inkEdge, ink1 * 0.8);

  // Slight bloom around mouse
  float bloom = exp(-dist * 1.0) * 0.2;
  color += bloom * vec3(0.3, 0.5, 0.8);

  gl_FragColor = vec4(color, 1.0);
}
