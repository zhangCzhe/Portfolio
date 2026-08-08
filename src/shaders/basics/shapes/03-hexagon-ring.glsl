#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_ring_count;
uniform float u_rotation_speed;
uniform vec3 u_accent_color;

float sdHexagon(vec2 p, float r) {
  float k = -0.866025404;
  p = abs(p);
  p -= 2.0 * min(dot(vec2(k, 0.5), p), 0.0) * vec2(k, 0.5);
  p -= vec2(clamp(p.x, -r * 0.5, r * 0.5), r);
  return length(p) * sign(p.y);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);

  float angle = atan(uv.y, uv.x) / 6.28318 + 0.5;
  float rings = floor(angle * u_ring_count);
  float r = 0.1 + rings * 0.08 + sin(u_time * u_rotation_speed + rings * 1.5) * 0.03;

  float d = sdHexagon(uv, r);

  vec3 color = vec3(0.08, 0.08, 0.15);
  float s = 0.005;
  vec3 ringColor = u_accent_color * (0.5 + 0.5 * cos(rings * 0.7 + u_time * u_rotation_speed));
  color = mix(color, ringColor, 1.0 - smoothstep(-s, s, d));

  gl_FragColor = vec4(color, 1.0);
}
