var e=`#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_wave_height;

float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5, f = 1.0;
  for (int i = 0; i < 4; i++) { v += a * noise(p*f); f *= 2.1; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.x *= u_resolution.x / u_resolution.y;

  // Sky gradient
  vec3 skyTop = vec3(0.65, 0.55, 0.4);
  vec3 skyLow = vec3(0.75, 0.68, 0.55);
  vec3 sky = mix(skyLow, skyTop, smoothstep(0.35, 0.75, uv.y));

  // Mt Fuji silhouette
  float fujiDist = abs(uv.x - 0.55);
  float fuji = smoothstep(0.08, 0.16, fujiDist) * smoothstep(0.3, 0.55, uv.y);
  float fujiPeak = 0.55 + (1.0 - fujiDist / 0.12) * 0.2;
  fuji *= step(uv.y, fujiPeak);
  vec3 fujiColor = vec3(0.2, 0.3, 0.5);
  fujiColor += vec3(0.85, 0.8, 0.7) * smoothstep(0.45, 0.55, uv.y) * 0.4;
  sky = mix(sky, fujiColor, fuji * 0.7);

  // The Great Wave
  float wave = 0.0;
  float foam = 0.0;
  float waveLimit = 0.65;

  if (uv.y < waveLimit) {
    // Main wave curve
    float wx = uv.x * 2.0 - 0.5;
    float wy = uv.y;

    // Primary wave arc
    float arc = wx - 0.5;
    float waveHeight = 0.2 * u_wave_height;
    wave = wy - (0.25 + waveHeight * (1.0 - arc * arc * 1.5));
    wave = smoothstep(0.0, 0.015, wave) * step(-1.0, arc) * step(arc, 1.0);

    // Secondary wave curls (foam fingers)
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      float cx = 0.2 + fi * 0.1;
      float cy = 0.22 + fi * 0.03;
      float amp = 1.0 + fi * 0.15;
      float finger = wy - (cy + 0.12 * sin(wx * 5.0 + fi * 1.5) * amp);
      finger *= smoothstep(0.0, 0.2, abs(wx - cx));
      wave = max(wave, smoothstep(0.0, 0.01, finger));
    }

    // Foam texture on wave crest
    foam = fbm(uv * vec2(8.0, 5.0) + u_time * 0.05) * 0.6;
    foam *= smoothstep(0.0, 0.08, wave);
    wave += foam * 0.4;
  }

  // Wave colors
  vec3 waveDark = vec3(0.05, 0.1, 0.3);
  vec3 waveMid = vec3(0.1, 0.25, 0.5);
  vec3 waveFoam = vec3(0.85, 0.82, 0.75);

  // Lower water
  float water = noise(uv * 8.0 + u_time * 0.1) * 0.3;
  vec3 waterColor = mix(waveDark, waveMid, water);

  // Composite
  vec3 color = sky;
  if (uv.y < 0.5) {
    color = mix(waterColor, color, smoothstep(0.35, 0.5, uv.y));
  }
  color = mix(color, waveMid, wave * 0.6);
  color = mix(color, waveFoam, wave * foam * 0.7);

  // Subtle vignette
  color *= 1.0 - length((uv - 0.5) * vec2(1.0, 0.8)) * 0.3;

  gl_FragColor = vec4(color, 1.0);
}
`;export{e as default};