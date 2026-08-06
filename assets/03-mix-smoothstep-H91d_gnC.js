var e=`#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_transition;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.x *= u_resolution.x / u_resolution.y;

  float t = uv.x;
  float smooth_edge = smoothstep(u_transition - 0.1, u_transition + 0.1, t);
  float sharp_edge = step(u_transition, t);

  vec3 left = vec3(0.1, 0.2, 0.8);
  vec3 right = vec3(0.9, 0.3, 0.2);

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
`;export{e as default};