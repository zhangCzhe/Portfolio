#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_angle;
uniform float u_mirrors;

vec2 rotate(vec2 p, float a) {
  float s = sin(a), c = cos(a);
  return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);

  float a = atan(uv.y, uv.x);
  float r = length(uv);

  // Mirror by angle segments
  float segment = 6.28318 / u_mirrors;
  a = mod(a + segment * 0.5, segment) - segment * 0.5;
  a = abs(a);

  vec2 folded = vec2(cos(a), sin(a)) * r;

  // Rotate
  float rot = u_angle * 2.0 * 3.14159 + u_time * 0.3;
  folded = rotate(folded, rot);

  // Pattern
  float pattern = sin(folded.x * 10.0) * sin(folded.y * 10.0) * 0.5 + 0.5;
  pattern = smoothstep(0.4, 0.6, pattern);

  vec3 col1 = vec3(0.1, 0.3, 0.7);
  vec3 col2 = vec3(0.9, 0.5, 0.3);
  vec3 color = mix(col1, col2, pattern);

  float vignette = 1.0 - r * 0.7;
  color *= smoothstep(0.0, 1.0, vignette);

  gl_FragColor = vec4(color, 1.0);
}
