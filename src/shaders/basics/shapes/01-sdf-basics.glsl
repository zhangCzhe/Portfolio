#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;

float sdCircle(vec2 p, float r) { return length(p) - r; }
float sdRect(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sdTriangle(vec2 p, float r) {
  float k = sqrt(3.0);
  p.x = abs(p.x) - r;
  p.y = p.y + r / k;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -2.0 * r, 0.0);
  return -length(p) * sign(p.y);
}
float sdStar(vec2 p, float r, int n, float m) {
  float an = 3.14159 / float(n);
  float en = 3.14159 / m;
  vec2 acs = vec2(cos(an), sin(an));
  vec2 ecs = vec2(cos(en), sin(en));
  float bn = mod(atan(p.y, p.x), 2.0 * an) - an;
  p = length(p) * vec2(cos(bn), abs(sin(bn)));
  p -= r * acs;
  p += ecs * clamp(-dot(p, ecs), 0.0, r * acs.y / ecs.y);
  return length(p) * sign(p.x);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  uv *= 1.5;

  vec3 color = vec3(0.08, 0.08, 0.15);
  float threshold = 0.006;

  // Circle (top-left)
  float d = sdCircle(uv - vec2(-0.65, 0.55), 0.3);
  if (d < threshold) color = mix(color, vec3(0.2, 0.7, 1.0), 1.0 - smoothstep(0.0, threshold, d));

  // Rectangle (top-right)
  d = sdRect(uv - vec2(0.65, 0.55), vec2(0.35, 0.2));
  if (d < threshold) color = mix(color, vec3(0.9, 0.4, 0.3), 1.0 - smoothstep(0.0, threshold, d));

  // Triangle (bottom-left)
  d = sdTriangle(uv - vec2(-0.65, -0.55), 0.35);
  if (d < threshold) color = mix(color, vec3(0.3, 0.9, 0.4), 1.0 - smoothstep(0.0, threshold, d));

  // Star (bottom-right)
  d = sdStar(uv - vec2(0.65, -0.55), 0.22, 5, 3.0);
  if (d < threshold) color = mix(color, vec3(1.0, 0.85, 0.2), 1.0 - smoothstep(0.0, threshold, d));

  gl_FragColor = vec4(color, 1.0);
}
