var e=`#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_scale;
uniform float u_bounce;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.x *= u_resolution.x / u_resolution.y;

  // Dynamic scaling
  float s = u_scale + sin(u_time * u_bounce) * 0.5;
  vec2 st = uv * s;

  float gx = fract(st.x);
  float gy = fract(st.y);

  float d = length(vec2(gx, gy) - 0.5);

  float pulse = sin(u_time * 2.0) * 0.5 + 0.5;
  float r = 0.25 + pulse * 0.15;
  float circle = 1.0 - smoothstep(r - 0.02, r + 0.02, d);

  vec3 color = vec3(0.05, 0.08, 0.2);
  vec3 cellColor = 0.5 + 0.5 * cos(vec3(1.0, 3.0, 5.0) + floor(st.x) * 0.7 + floor(st.y) * 1.3 + u_time);

  color = mix(color, cellColor * 0.3, 0.3);
  color = mix(color, cellColor, circle);

  gl_FragColor = vec4(color, 1.0);
}
`;export{e as default};