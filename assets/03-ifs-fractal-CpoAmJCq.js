var e=`#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_iterations;

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  uv.y *= -1.0;

  vec3 color = vec3(0.05, 0.05, 0.15);

  float scale = 1.0;
  float a = 0.0;
  for (float i = 0.0; i < 10.0; i++) {
    if (i >= u_iterations) break;

    uv = abs(uv);
    uv = uv * 2.0 - 1.0;
    uv *= 0.9;

    float r = length(uv);
    a += exp(-r * 3.0) * scale;
    scale *= 0.5;
  }

  vec3 col1 = vec3(0.1, 0.3, 0.8);
  vec3 col2 = vec3(0.8, 0.2, 0.5);
  color += a * mix(col1, col2, sin(u_time * 0.3) * 0.5 + 0.5);

  gl_FragColor = vec4(color, 1.0);
}
`;export{e as default};