#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_videoSize;
uniform float u_slices;
uniform float u_rotation;

// Crop-fit (cover) the video frame into the canvas without stretching
vec2 coverUV(vec2 uv) {
  float ca = u_resolution.x / u_resolution.y;
  float va = u_videoSize.x / u_videoSize.y;
  vec2 s = ca > va ? vec2(1.0, va / ca) : vec2(ca / va, 1.0);
  return (uv - 0.5) * s + 0.5;
}

void main() {
  vec2 uv = coverUV(gl_FragCoord.xy / u_resolution);
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
