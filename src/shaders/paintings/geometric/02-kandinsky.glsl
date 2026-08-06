#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;

float sdCircle(vec2 p, float r) { return length(p) - r; }
float sdRect(vec2 p, vec2 b) { vec2 d = abs(p)-b; return length(max(d,0.0))+min(max(d.x,d.y),0.0); }

float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);

  vec3 bg = vec3(0.88, 0.82, 0.72); // warm canvas
  vec3 color = bg;

  // Large yellow circle (top-left)
  float d = sdCircle(uv - vec2(-0.3, 0.45), 0.22);
  color = mix(color, vec3(0.9, 0.8, 0.1), 1.0 - smoothstep(-0.01, 0.01, d));

  // Blue filled circle (center-right)
  d = sdCircle(uv - vec2(0.45, 0.05), 0.18);
  color = mix(color, vec3(0.05, 0.2, 0.7), 1.0 - smoothstep(-0.01, 0.01, d));

  // Red circle (bottom-left)
  d = sdCircle(uv - vec2(-0.25, -0.4), 0.12);
  color = mix(color, vec3(0.85, 0.1, 0.1), 1.0 - smoothstep(-0.01, 0.01, d));

  // Small black circles
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 pos = vec2(
      sin(fi * 1.7 + 1.0) * 0.5,
      cos(fi * 2.1 + 0.5) * 0.3
    );
    float r = 0.02 + fi * 0.008;
    d = sdCircle(uv - pos, r);
    color = mix(color, vec3(0.05, 0.05, 0.08), 1.0 - smoothstep(-0.003, 0.003, d));
  }

  // Diagonal lines
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float angle = fi * 0.6 + 0.2;
    float d = abs(-uv.x * sin(angle) + uv.y * cos(angle) + 0.3 - fi * 0.15);
    color = mix(color, vec3(0.1), 1.0 - smoothstep(0.005, 0.007, d) * 0.7);
  }

  // Rectangular outlines
  d = sdRect(uv - vec2(0.1, -0.1), vec2(0.25, 0.15));
  color = mix(color, vec3(0.15), 1.0 - smoothstep(0.002, 0.006, abs(d) - 0.002) * 0.6);

  // Subtle grain
  color += hash(uv * 500.0) * 0.015;

  gl_FragColor = vec4(color, 1.0);
}
