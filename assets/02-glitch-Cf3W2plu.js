var e=`#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_time;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  // Random horizontal shift
  float shift = hash(vec2(floor(uv.y * 30.0), floor(u_time * 5.0))) * u_intensity * 0.1;

  // Color channel split
  float r = texture2D(u_texture, vec2(uv.x + shift * 2.0, uv.y)).r;
  float g = texture2D(u_texture, vec2(uv.x, uv.y)).g;
  float b = texture2D(u_texture, vec2(uv.x - shift, uv.y)).b;

  // Scan line
  float scanline = sin(uv.y * 500.0) * 0.05;

  // Glitch blocks
  float block = step(0.98, hash(vec2(floor(uv.y * 20.0), floor(u_time * 3.0))));
  float blockShift = block * u_intensity * 0.15;

  vec3 color = vec3(
    texture2D(u_texture, vec2(uv.x + blockShift, uv.y)).r,
    texture2D(u_texture, vec2(uv.x - blockShift * 0.5, uv.y)).g,
    b
  );

  color += scanline;
  color = clamp(color, 0.0, 1.0);

  gl_FragColor = vec4(color, 1.0);
}
`;export{e as default};