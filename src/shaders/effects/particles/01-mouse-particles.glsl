#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_count;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  vec3 color = vec3(0.05, 0.05, 0.12);

  float particleCount = u_count * 30.0;

  for (float i = 0.0; i < 50.0; i++) {
    if (i >= particleCount) break;

    float seed = hash(vec2(i, 0.0));
    float seed2 = hash(vec2(i, 1.0));
    float seed3 = hash(vec2(i, 2.0));

    // Particle orbit
    float radius = 0.05 + seed * 0.3;
    float speed = 0.3 + seed2 * 1.0;
    float angle = u_time * speed + seed3 * 6.28318;

    vec2 center = u_mouse;
    center.x += cos(angle) * radius;
    center.y += sin(angle) * radius * 0.7;

    // Add drift
    center += vec2(
      sin(u_time * 0.3 + seed * 6.28) * 0.1,
      cos(u_time * 0.4 + seed2 * 6.28) * 0.1
    );

    float d = length(uv - center);
    float glow = exp(-d * d * 600.0) * 0.3;

    // Particle tail (trailing behind)
    float tailAngle = angle + 3.14159;
    vec2 tail = center + vec2(cos(tailAngle), sin(tailAngle)) * 0.02;
    float tailD = length(uv - tail);
    glow += exp(-tailD * tailD * 200.0) * 0.15;

    // Color based on particle index
    float hue = fract(seed + u_time * 0.1);
    vec3 particleColor = 0.5 + 0.5 * cos(6.28 * (hue + vec3(0.0, 0.33, 0.67)));

    color += glow * particleColor;
  }

  // Center glow
  float centerGlow = exp(-length(uv - u_mouse) * 3.0) * 0.15;
  color += centerGlow * vec3(0.3, 0.5, 0.9);

  gl_FragColor = vec4(color, 1.0);
}
