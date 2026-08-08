// src/shaders/paintings/secession/01-klimt-kiss.glsl
// Klimt — The Kiss (gold leaf fragments)
#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_sparkle_density;
uniform float u_gold_hue;
uniform float u_fragment_size;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x),
             mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  vec2 mouse = u_mouse * 2.0 - 1.0;

  // Warm gold background with abstract flowing patterns
  vec3 goldBase = mix(vec3(0.7, 0.5, 0.15), vec3(0.95, 0.8, 0.3), u_gold_hue);
  float bgPattern = noise(uv * 3.0 + u_time * 0.05) * 0.3;
  vec3 col = goldBase + bgPattern * 0.1;

  // Gold leaf fragments — cells of sparkle that rotate toward mouse
  float cellSize = u_fragment_size * 0.15;
  vec2 cellUV = uv / cellSize;
  vec2 cellId = floor(cellUV);
  vec2 cellF = fract(cellUV);

  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec2 neighbor = cellId + vec2(float(x), float(y));
      float h = hash(neighbor);
      vec2 offset = vec2(hash(neighbor + 0.1), hash(neighbor + 0.2)) - 0.5;

      // Distance from mouse influences fragment brightness
      vec2 worldPos = (neighbor + offset) * cellSize;
      float distToMouse = length(worldPos - mouse * 0.8);
      float mouseAttract = smoothstep(0.5, 0.0, distToMouse);

      // Each fragment flickers independently
      float sparkle = sin(u_time * (3.0 + h * 5.0) + h * 20.0) * 0.5 + 0.5;
      sparkle = pow(sparkle, 4.0) * u_sparkle_density;

      float d = length(cellF - 0.5 - offset * 0.3) - 0.15;
      float shape = smoothstep(0.02, 0.0, d);
      col += goldBase * shape * (sparkle * 0.8 + mouseAttract * 0.6) * 0.5;
    }
  }

  // Abstract figure silhouettes (simplified organic curves) in warm dark tones
  float figure1 = smoothstep(0.02, 0.0, abs(uv.x + 0.1 + sin(uv.y * 4.0) * 0.1) - 0.03) *
                  smoothstep(-0.3, 0.3, uv.y);
  float figure2 = smoothstep(0.02, 0.0, abs(uv.x - 0.0 + cos(uv.y * 3.5) * 0.08) - 0.025) *
                  smoothstep(-0.35, 0.35, uv.y);
  vec3 figureCol = vec3(0.2, 0.1, 0.05);
  col = mix(col, figureCol, (figure1 + figure2) * 0.7);

  gl_FragColor = vec4(col, 1.0);
}
