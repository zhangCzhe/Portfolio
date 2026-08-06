#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);

  vec2 center = vec2(0.0, 0.15);
  float r = 0.3;
  float d = length(uv - center);

  if (d > r) {
    gl_FragColor = vec4(0.06, 0.06, 0.16, 1.0);
    return;
  }

  float z = sqrt(r * r - d * d);
  vec3 normal = normalize(vec3(uv - center, z));

  vec3 lightTop = normalize(vec3(0.3, 1.2, 1.0));
  vec3 lightBottom = normalize(vec3(-0.5, -0.8, 0.2));

  // Refraction-like highlight
  float hl1 = pow(max(dot(normal, lightTop), 0.0), 200.0);
  float hl2 = pow(max(dot(normal, lightTop), 0.0), 16.0) * 0.3;
  float hl3 = pow(max(dot(normal, lightBottom), 0.0), 8.0) * 0.2;

  // Caustic-like rim
  float rim = pow(1.0 - z / r, 3.0) * 0.6;

  // Background "refraction" simulation
  float refraction = sin((uv.x - center.x) * 20.0 + u_time) * 0.1;

  vec3 color = vec3(0.1, 0.2, 0.4);
  color += hl1 * 1.2;
  color += hl2 * 0.6;
  color += hl3 * vec3(0.3, 0.5, 0.7);
  color += rim * vec3(0.2, 0.4, 0.8);
  color += refraction * 0.1;

  color = clamp(color, 0.0, 1.0);

  gl_FragColor = vec4(color, 1.0);
}
