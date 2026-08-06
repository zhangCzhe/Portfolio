var e=`#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_red_weight;
uniform float u_green_weight;
uniform float u_blue_weight;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec4 tex = texture2D(u_texture, uv);

  float gray = tex.r * u_red_weight + tex.g * u_green_weight + tex.b * u_blue_weight;
  gl_FragColor = vec4(vec3(gray), 1.0);
}
`;export{e as default};