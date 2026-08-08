#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_videoSize;
uniform float u_strength;

// Crop-fit (cover) the video frame into the canvas without stretching
vec2 coverUV(vec2 uv) {
  float ca = u_resolution.x / u_resolution.y;
  float va = u_videoSize.x / u_videoSize.y;
  vec2 s = ca > va ? vec2(1.0, va / ca) : vec2(ca / va, 1.0);
  return (uv - 0.5) * s + 0.5;
}

void main() {
  vec2 rawUV = gl_FragCoord.xy / u_resolution;
  vec2 uv = coverUV(rawUV);
  vec4 tex = texture2D(u_texture, uv);

  float gray = dot(tex.rgb, vec3(0.299, 0.587, 0.114));

  vec3 sepia = vec3(
    gray * 1.2,
    gray * 0.9,
    gray * 0.7
  );

  vec3 color = mix(tex.rgb, sepia, u_strength);

  // Add slight vignette
  float vignette = 1.0 - length(uv - 0.5) * 0.5;
  color *= smoothstep(0.0, 1.0, vignette);

  gl_FragColor = vec4(color, 1.0);
}
