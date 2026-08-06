#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_mist;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5, f = 1.0;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p * f);
    f *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.x *= u_resolution.x / u_resolution.y;

  // Sky gradient
  vec3 skyTop = vec3(0.3, 0.4, 0.6);
  vec3 skyMid = vec3(0.86, 0.55, 0.35);
  vec3 skyLow = vec3(0.95, 0.7, 0.4);
  vec3 sky = mix(skyLow, skyMid, smoothstep(0.25, 0.55, uv.y));
  sky = mix(sky, skyTop, smoothstep(0.55, 0.8, uv.y));

  // Mist layers
  float mist = fbm(uv * 3.0 + u_time * 0.03) * u_mist;
  mist += fbm(uv * 1.5 - u_time * 0.02) * 0.3 * u_mist;
  mist = smoothstep(0.3, 0.7, mist);

  vec3 mistColor = vec3(0.7, 0.55, 0.5);
  sky = mix(sky, mistColor, mist * 0.4);

  // Sun
  vec2 sunPos = vec2(0.5, 0.45);
  float sunD = length(uv - sunPos);
  float sun = exp(-sunD * 8.0) * 0.7;
  float sunGlow = exp(-sunD * 2.5) * 0.5;
  float sunHalo = exp(-sunD * 1.0) * 0.3;

  vec3 sunColor = vec3(1.0, 0.7, 0.3);
  sky += sunGlow * sunColor * 0.4;
  sky += sunHalo * vec3(1.0, 0.5, 0.2) * 0.2;
  sky += sun * vec3(1.0, 0.9, 0.7) * 0.6;

  // Water reflection of sun — compute reflection once outside the block
  float reflection = 0.0;
  if (uv.y < 0.3) {
    float refD = abs(uv.x - sunPos.x) * 1.5;
    reflection = exp(-refD * 2.0) * exp(-(0.3 - uv.y) * 8.0) * 0.4;
    reflection += noise(uv * vec2(1.0, 20.0) + u_time * 0.2) * 0.1;
    sky += reflection * sunColor * 0.3;
  }

  // Water area
  if (uv.y < 0.3) {
    float water = noise(uv * vec2(3.0, 8.0) + u_time * 0.1) * 0.3;
    vec3 waterColor = mix(
      vec3(0.15, 0.25, 0.35),
      vec3(0.25, 0.4, 0.45),
      water
    );
    waterColor += sunColor * reflection * 0.15;
    sky = mix(waterColor, sky, smoothstep(0.25, 0.3, uv.y));
  }

  // Small boats
  if (uv.y < 0.32 && uv.y > 0.26) {
    float boat = sin((uv.x - sunPos.x + 0.05) * 60.0) * 0.5 + 0.5;
    boat *= smoothstep(0.28, 0.3, abs(uv.y - 0.29));
    boat *= smoothstep(0.0, 0.005, abs(uv.x - sunPos.x) - 0.03);
    sky = mix(sky, vec3(0.1, 0.1, 0.15), boat * 0.4);

    // Boat 2
    boat = sin((uv.x - sunPos.x - 0.1) * 40.0) * 0.5 + 0.5;
    boat *= smoothstep(0.28, 0.3, abs(uv.y - 0.29));
    boat *= smoothstep(0.0, 0.005, abs(uv.x - sunPos.x - 0.1) - 0.02);
    sky = mix(sky, vec3(0.1, 0.1, 0.15), boat * 0.3);
  }

  gl_FragColor = vec4(sky, 1.0);
}
