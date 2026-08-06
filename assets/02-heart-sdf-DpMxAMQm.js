var e=`#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_smooth;

float sdHeart(vec2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) return sqrt((p.x - 0.25) * (p.x - 0.25) + (p.y - 0.75) * (p.y - 0.75)) - sqrt(2.0) / 4.0;
  return sqrt(min(
    (p.x - 0.25) * (p.x - 0.25) + (p.y - 0.75) * (p.y - 0.75),
    (p.x) * (p.x) + (p.y - 0.25) * (p.y - 0.25)
  )) - 0.25;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);

  float size = 0.35 + sin(u_time * 1.5) * 0.05;
  float d = sdHeart(uv / size);

  float sdf = u_smooth * 0.05;
  float alpha = 1.0 - smoothstep(0.0, sdf, d);
  float outline = 1.0 - smoothstep(-0.02, 0.01, abs(d) - 0.01);

  vec3 fillColor = vec3(0.95, 0.25, 0.4);
  vec3 outlineColor = vec3(1.0, 0.6, 0.7);

  vec3 color = mix(vec3(0.08, 0.08, 0.15), outlineColor, outline);
  color = mix(color, fillColor, alpha);

  gl_FragColor = vec4(color, 1.0);
}
`;export{e as default};