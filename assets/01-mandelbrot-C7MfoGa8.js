var e=`#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_zoom;

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);

  float scale = 2.5 / u_zoom;
  vec2 c = uv * scale + vec2(-0.7, 0.0);
  c.x += sin(u_time * 0.2) * 0.1;

  vec2 z = vec2(0.0);
  float iter = 0.0;
  const int maxIter = 80;

  for (int i = 0; i < maxIter; i++) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    if (dot(z, z) > 4.0) break;
    iter += 1.0;
  }

  float m = iter / float(maxIter);
  vec3 inside = vec3(0.05, 0.05, 0.15);
  vec3 outside = 0.5 + 0.5 * cos(6.28318 * (m * 2.0 + vec3(0.0, 0.33, 0.67)));

  float smoothed = m + 1.0 - log2(log2(dot(z, z)) * 0.5);
  smoothed = clamp(smoothed / float(maxIter), 0.0, 1.0);

  vec3 color = mix(inside, outside, smoothed);

  gl_FragColor = vec4(color, 1.0);
}
`;export{e as default};