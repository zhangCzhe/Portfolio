#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_transition;
uniform vec3 u_color_a;
uniform vec3 u_color_b;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.x *= u_resolution.x / u_resolution.y;

  float t = uv.x;
  float smooth_edge = smoothstep(u_transition - 0.1, u_transition + 0.1, t);
  float sharp_edge = step(u_transition, t);

  vec3 left = u_color_a;
  vec3 right = u_color_b;

  vec3 color = mix(left, right, smooth_edge);

  // smoothstep vs step visualization
  float y_half = step(0.5, uv.y);
  color = mix(color, mix(left, right, sharp_edge), y_half);

  // dividing line
  if (abs(uv.x - u_transition) < 0.005) {
    color = vec3(1.0);
  }

  gl_FragColor = vec4(color, 1.0);
}
