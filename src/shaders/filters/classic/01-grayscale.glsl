#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_videoSize;
uniform float u_red_weight;
uniform float u_green_weight;
uniform float u_blue_weight;

// Crop-fit (cover) the video frame into the canvas without stretching
vec2 coverUV(vec2 uv) {
  float ca = u_resolution.x / u_resolution.y;
  float va = u_videoSize.x / u_videoSize.y;
  vec2 s = ca > va ? vec2(1.0, va / ca) : vec2(ca / va, 1.0);
  return (uv - 0.5) * s + 0.5;
}

void main() {
  vec2 uv = coverUV(gl_FragCoord.xy / u_resolution);
  vec4 tex = texture2D(u_texture, uv);

  float gray = tex.r * u_red_weight + tex.g * u_green_weight + tex.b * u_blue_weight;
  gl_FragColor = vec4(vec3(gray), 1.0);
}
