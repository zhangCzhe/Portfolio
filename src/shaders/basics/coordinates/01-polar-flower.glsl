#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_petals;
uniform float u_radius;

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);

  float angle = atan(uv.y, uv.x);
  float radius = length(uv);

  // Polar distortion
  float petal = cos(angle * u_petals) * 0.5 + 0.5;
  float shape = smoothstep(radius, radius + 0.05, petal * 0.7 * u_radius);

  // Color based on angle and radius
  vec3 baseColor = 0.5 + 0.5 * cos(angle * 3.0 + vec3(0.0, 2.0, 4.0));
  vec3 color = baseColor * shape;

  // Center glow
  float glow = exp(-radius * 5.0) * 0.5;
  color += glow * vec3(1.0, 0.9, 0.6);

  float vignette = 1.0 - radius * 0.5;
  color *= smoothstep(0.0, 1.0, vignette);

  gl_FragColor = vec4(color, 1.0);
}
