#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_dot_size;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec4 tex = texture2D(u_texture, uv);

  float gray = dot(tex.rgb, vec3(0.299, 0.587, 0.114));

  float grid = u_dot_size * 40.0;
  vec2 st = fract(gl_FragCoord.xy / grid) - 0.5;
  float d = length(st);
  float dot = 1.0 - smoothstep(gray * 0.45, gray * 0.5, d);

  vec3 color = vec3(1.0) * (1.0 - dot);

  gl_FragColor = vec4(color, 1.0);
}
