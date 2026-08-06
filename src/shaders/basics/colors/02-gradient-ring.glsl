#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;

vec3 palette(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);

  float d = length(uv);
  float angle = atan(uv.y, uv.x) / 6.28318 + 0.5;

  float t = angle + d * 2.0 - u_time * u_speed * 0.3;
  vec3 color = palette(t);

  float ring = abs(sin(d * 12.0 - u_time * u_speed)) * 0.3;
  color += ring * 0.5;

  gl_FragColor = vec4(color, 1.0);
}
