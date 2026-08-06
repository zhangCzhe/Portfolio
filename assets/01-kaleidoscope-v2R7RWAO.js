var e=`#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_slices;
uniform float u_rotation;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 centered = uv - 0.5;

  float angle = atan(centered.y, centered.x) + u_rotation;
  float radius = length(centered);

  float slice = 6.28318 / u_slices;
  angle = mod(angle, slice) - slice * 0.5;
  angle = abs(angle);

  vec2 folded = vec2(cos(angle), sin(angle)) * radius + 0.5;

  vec4 color = texture2D(u_texture, clamp(folded, 0.0, 1.0));
  gl_FragColor = color;
}
`;export{e as default};