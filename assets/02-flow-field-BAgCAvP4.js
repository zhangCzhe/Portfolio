var e=`#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_density;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.x *= u_resolution.x / u_resolution.y;

  vec3 color = vec3(0.04, 0.04, 0.1);
  float count = u_density * 40.0;

  for (float i = 0.0; i < 60.0; i++) {
    if (i >= count) break;
    float seed = hash(vec2(i, 0.0));

    // Starting position from noise
    float angle = noise(vec2(seed * 3.0, u_time * 0.1)) * 12.57;
    float radius = seed * 0.6;

    vec2 pos = vec2(0.5 + cos(angle) * radius, 0.5 + sin(angle) * radius);

    // Flow direction from Perlin field
    float theta = noise(pos * 3.0 + u_time * 0.15) * 12.57;
    pos += vec2(cos(theta), sin(theta)) * 0.02;

    float d = length(uv - pos);
    float trail = exp(-d * d * 800.0) * 0.2;

    float hue = fract(seed + u_time * 0.05);
    vec3 trailColor = 0.5 + 0.5 * cos(6.28 * (hue + vec3(0.0, 0.33, 0.67)));

    color += trail * trailColor;
  }

  // Mouse influence
  float mouseInfluence = exp(-length(uv - u_mouse) * 2.0) * 0.3;
  color += mouseInfluence * vec3(0.4, 0.6, 1.0);

  gl_FragColor = vec4(color, 1.0);
}
`;export{e as default};