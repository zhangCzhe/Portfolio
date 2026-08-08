#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_c_real;
uniform float u_c_imag;
uniform float u_zoom;

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);

  vec2 c = vec2(u_c_real, u_c_imag);
  vec2 z = uv * (3.0 / u_zoom);

  float iter = 0.0;
  const int maxIter = 80;

  for (int i = 0; i < maxIter; i++) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    if (dot(z, z) > 4.0) break;
    iter += 1.0;
  }

  float m = iter / float(maxIter);
  vec3 inside = vec3(0.05, 0.05, 0.15);
  vec3 outside = 0.5 + 0.5 * cos(6.28318 * (m * 4.0 + u_time * 0.2 + vec3(0.0, 0.33, 0.67)));

  vec3 color = mix(inside, outside, m);

  gl_FragColor = vec4(color, 1.0);
}
