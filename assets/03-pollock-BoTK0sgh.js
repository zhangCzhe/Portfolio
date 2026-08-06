var e=`#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_density;
uniform float u_speed;

float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}

float fbm(vec2 p) {
  float v=0.0, a=0.5, f=1.0;
  for(int i=0;i<4;i++){v+=a*noise(p*f);f*=2.0;a*=0.5;}
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.x *= u_resolution.x / u_resolution.y;

  // Canvas base - light beige
  vec3 canvas = vec3(0.92, 0.87, 0.78);
  vec3 color = canvas;
  float canvasTexture = noise(uv * 300.0) * 0.02;
  color += canvasTexture;

  // Multiple paint drip layers
  // Layer 1: Black/grey splatters
  float layer1 = 0.0;
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    vec2 sp = vec2(
      hash(vec2(fi, 0.0)) * 1.2 - 0.1,
      hash(vec2(fi, 1.0)) * 1.1 - 0.05
    );
    float size = 0.01 + hash(vec2(fi, 2.0)) * 0.04;
    float d = length(uv - sp) / size;

    // Splatter ring effect
    float ring = exp(-d * 1.5) * (0.3 + 0.7 * sin(d * 15.0 + fi));
    ring += exp(-d * d * 3.0) * 0.6;

    // Drip lines
    float dripY = uv.y - sp.y;
    float drip = exp(-abs(uv.x - sp.x) / 0.005) * smoothstep(-0.03, 0.0, dripY) * smoothstep(0.1, 0.03, dripY);
    drip *= hash(vec2(fi, 0.5)) * 0.5 + 0.5;

    layer1 += (ring + drip * 0.3) * u_density;
  }
  vec3 black = vec3(0.05, 0.05, 0.08);
  color = mix(color, black, clamp(layer1, 0.0, 1.0) * 0.7);

  // Layer 2: Warm colors (red/orange/yellow)
  float layer2 = 0.0;
  vec3 accentColor = vec3(0.0);
  for (int i = 0; i < 15; i++) {
    float fi = float(i);
    vec2 sp = vec2(
      hash(vec2(fi, 3.0)) * 1.2 - 0.1,
      hash(vec2(fi, 4.0)) * 1.1 - 0.05
    );
    float d = length(uv - sp) / (0.015 + hash(vec2(fi, 5.0)) * 0.035);

    float splat = exp(-d * d * 2.5) * 0.5;
    float arc = exp(-abs(d - 0.6) * 3.0) * 0.3;

    // Drip trails
    float trail = exp(-abs(uv.x - sp.x) / 0.004) * exp(-abs(uv.y - sp.y) / 0.06) * 0.4;

    layer2 += (splat + arc + trail) * u_density * 0.8;

    // Color from hash
    float hue = hash(vec2(fi, 6.0));
    vec3 c = 0.5 + 0.5 * cos(6.28 * (hue + vec3(0.0, 0.33, 0.67)));
    accentColor += splat * c * 0.15;
  }
  color = mix(color, accentColor * 1.5, clamp(layer2, 0.0, 1.0));

  // Paint thickness / overlap texture
  float thickness = fbm(uv * 40.0 + u_time * 0.02 * u_speed) * 0.05;
  color += thickness * (layer1 + layer2) * 0.3;

  gl_FragColor = vec4(color, 1.0);
}
`;export{e as default};