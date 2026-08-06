#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_freq;

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);

  float d1 = length(uv - vec2(-0.3, 0.0));
  float d2 = length(uv - vec2(0.3, 0.0));

  float r1 = sin(d1 * u_freq - u_time * 0.5) * 0.5 + 0.5;
  float r2 = sin(d2 * u_freq * 1.1 + u_time * 0.3) * 0.5 + 0.5;

  float moire = r1 * r2;
  moire = smoothstep(0.4, 0.6, moire);

  vec3 color1 = vec3(0.05, 0.1, 0.25);
  vec3 color2 = vec3(0.3, 0.7, 0.9);
  vec3 color = mix(color1, color2, moire);

  float vignette = 1.0 - length(uv) * 0.6;
  color *= smoothstep(0.0, 1.0, vignette);

  gl_FragColor = vec4(color, 1.0);
}
