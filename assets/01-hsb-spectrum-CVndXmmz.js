var e=`#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;

vec3 hsb2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z * mix(vec3(1.0), rgb, c.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.x *= u_resolution.x / u_resolution.y;

  float hue = uv.x + u_time * 0.1;
  float saturation = 0.8;
  float brightness = uv.y;

  vec3 color = hsb2rgb(vec3(fract(hue), saturation, brightness));
  gl_FragColor = vec4(color, 1.0);
}
`;export{e as default};