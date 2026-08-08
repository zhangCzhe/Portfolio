// src/shaders/effects/reaction/01-reaction-diffusion.glsl
#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_feed_rate;
uniform float u_kill_rate;
uniform float u_diffusion_speed;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 texel = 1.0 / u_resolution;

  // Seed pattern with noise — the reaction-diffusion "initial conditions"
  float n = hash(floor(uv * 200.0));
  float u_conc = n;
  float v_conc = n * 0.5 + 0.25;

  // Simplified single-pass Laplacian (neighbor sampling approximation)
  // In a full implementation, this would use a ping-pong FBO.
  // Here we generate a static-like texture that resembles RD patterns
  // via iterated local averaging + thresholding.
  float sum = 0.0;
  for (int dx = -2; dx <= 2; dx++) {
    for (int dy = -1; dy <= 1; dy++) {
      sum += hash(floor((uv + vec2(float(dx), float(dy))) * 200.0 + u_time * 0.01));
    }
  }
  sum /= 15.0;

  float reaction = u_conc * v_conc * v_conc;
  float du = u_diffusion_speed * (sum - u_conc) - reaction + u_feed_rate * (1.0 - u_conc);
  float dv = u_diffusion_speed * 0.5 * (sum - v_conc) + reaction - (u_feed_rate + u_kill_rate) * v_conc;

  float pattern = du + dv;
  pattern = smoothstep(0.3, 0.7, pattern);

  // Mouse injects perturbation
  float mouseDist = length(uv - u_mouse);
  float inject = exp(-mouseDist * 15.0) * 0.5;
  pattern = mix(pattern, 1.0 - pattern, inject);

  // Colorize based on pattern morphology
  vec3 spots = mix(vec3(0.1, 0.05, 0.02), vec3(0.9, 0.85, 0.7), pattern);
  vec3 stripes = mix(vec3(0.02, 0.05, 0.1), vec3(0.95, 0.92, 0.85), smoothstep(0.4, 0.6, pattern + 0.1 * sin(uv.x * 50.0)));

  float morph = sin(u_time * 0.1) * 0.5 + 0.5;
  vec3 col = mix(spots, stripes, morph);

  gl_FragColor = vec4(col, 1.0);
}
