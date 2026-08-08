// Professional B&W — weighted luminance conversion (per-channel sliders), an
// S-curve contrast stage, film grain, and a soft radial vignette for that
// classic darkroom print look.
#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform sampler2D u_texture;
uniform vec2 u_videoSize;
uniform float u_red_weight;
uniform float u_green_weight;
uniform float u_blue_weight;
uniform float u_grain;
uniform float u_vignette;
uniform float u_contrast;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 uv = gl_FragCoord.xy / u_videoSize;
  vec3 tex = texture2D(u_texture, uv).rgb;

  // Weighted grayscale
  float gray = dot(tex, vec3(u_red_weight, u_green_weight, u_blue_weight));

  // Contrast S-curve
  gray = smoothstep(0.0, 1.0, (gray - 0.5) * (1.0 + u_contrast) + 0.5);

  // Film grain
  gray += (hash(uv * u_videoSize + fract(u_blue_weight * 100.0)) - 0.5) * u_grain * 0.15;

  // Vignette
  float dist = length(uv - 0.5) * 1.4;
  gray *= 1.0 - smoothstep(0.3, 1.0, dist) * u_vignette;

  vec3 col = vec3(clamp(gray, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}
