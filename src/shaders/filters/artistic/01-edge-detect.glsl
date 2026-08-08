#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_videoSize;
uniform float u_threshold;

// Crop-fit (cover) the video frame into the canvas without stretching
vec2 coverUV(vec2 uv) {
  float ca = u_resolution.x / u_resolution.y;
  float va = u_videoSize.x / u_videoSize.y;
  vec2 s = ca > va ? vec2(1.0, va / ca) : vec2(ca / va, 1.0);
  return (uv - 0.5) * s + 0.5;
}

void main() {
  vec2 uv = coverUV(gl_FragCoord.xy / u_resolution);
  vec2 pixel = 1.0 / u_resolution;

  // Sobel operator
  float tl = dot(texture2D(u_texture, uv + vec2(-1, 1) * pixel).rgb, vec3(0.333));
  float t  = dot(texture2D(u_texture, uv + vec2( 0, 1) * pixel).rgb, vec3(0.333));
  float tr = dot(texture2D(u_texture, uv + vec2( 1, 1) * pixel).rgb, vec3(0.333));
  float l  = dot(texture2D(u_texture, uv + vec2(-1, 0) * pixel).rgb, vec3(0.333));
  float r  = dot(texture2D(u_texture, uv + vec2( 1, 0) * pixel).rgb, vec3(0.333));
  float bl = dot(texture2D(u_texture, uv + vec2(-1,-1) * pixel).rgb, vec3(0.333));
  float b  = dot(texture2D(u_texture, uv + vec2( 0,-1) * pixel).rgb, vec3(0.333));
  float br = dot(texture2D(u_texture, uv + vec2( 1,-1) * pixel).rgb, vec3(0.333));

  float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
  float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;

  float edge = sqrt(gx * gx + gy * gy);
  edge = step(u_threshold, edge);

  vec3 color = vec3(1.0 - edge);
  gl_FragColor = vec4(color, 1.0);
}
