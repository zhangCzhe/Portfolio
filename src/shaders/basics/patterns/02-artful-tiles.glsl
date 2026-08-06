#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_density;

vec2 tile(vec2 st, vec2 n) {
  return fract(st * n);
}

float pattern(vec2 st, float t) {
  vec2 gv = fract(st) - 0.5;
  float d = length(gv);

  float circles = smoothstep(0.35, 0.34, d) * smoothstep(0.05, 0.06, d);
  float dots = smoothstep(0.1, 0.09, d);

  float angle = atan(gv.y, gv.x) / 6.28318 + 0.5;
  float rotating = sin(angle * 6.28318 * 4.0 + t) * 0.5 + 0.5;

  return mix(circles, dots, rotating);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.x *= u_resolution.x / u_resolution.y;

  vec2 st = uv * u_density;
  float t = u_time * 0.5;

  float p = pattern(st, t);

  vec3 col1 = vec3(0.05, 0.1, 0.3);
  vec3 col2 = vec3(0.9, 0.6, 0.2);
  vec3 color = mix(col1, col2, p);

  gl_FragColor = vec4(color, 1.0);
}
