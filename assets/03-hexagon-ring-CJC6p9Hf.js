var e=`#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_rings;
uniform float u_scale;

float sdHexagon(vec2 p, float r) {
  float k = -0.866025404;
  p = abs(p);
  p -= 2.0 * min(dot(vec2(k, 0.5), p), 0.0) * vec2(k, 0.5);
  p -= vec2(clamp(p.x, -r * 0.5, r * 0.5), r);
  return length(p) * sign(p.y);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  uv *= u_scale;

  float angle = atan(uv.y, uv.x) / 6.28318 + 0.5;
  float rings = floor(angle * u_rings);
  float r = 0.1 + rings * 0.08 + sin(u_time * 0.5 + rings * 1.5) * 0.03;

  float d = sdHexagon(uv, r);

  vec3 color = vec3(0.08, 0.08, 0.15);
  float s = 0.005;
  color = mix(color, 0.5 + 0.5 * cos(vec3(0.0, 2.0, 4.0) + rings * 0.5), 1.0 - smoothstep(-s, s, d));

  gl_FragColor = vec4(color, 1.0);
}
`;export{e as default};