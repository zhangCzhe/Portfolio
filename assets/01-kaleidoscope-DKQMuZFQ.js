var e=`#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_slices;

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);

  float angle = atan(uv.y, uv.x);
  float radius = length(uv);

  float slice = 6.28318 / u_slices;
  angle = mod(angle, slice) - slice * 0.5;
  angle = abs(angle);

  vec2 folded = vec2(cos(angle), sin(angle)) * radius;

  float d = sin(folded.x * 8.0 + u_time) * cos(folded.y * 8.0 - u_time * 0.7) * 0.5 + 0.5;
  d = smoothstep(0.3, 0.7, d);

  vec3 color1 = vec3(0.1, 0.3, 0.8);
  vec3 color2 = vec3(0.8, 0.2, 0.5);
  vec3 color = mix(color1, color2, d);

  float vignette = 1.0 - radius * 0.8;
  color *= smoothstep(0.0, 1.0, vignette);

  gl_FragColor = vec4(color, 1.0);
}
`;export{e as default};