#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_metalness;

vec3 hsv2rgb(vec3 c) {
  return c.z * mix(vec3(1.0), clamp(abs(fract(c.x * 6.0 + vec3(0.0, 4.0, 2.0)) * 6.0 - 3.0) - 1.0, 0.0, 1.0), c.y);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);

  float r = 0.45;
  float d2 = dot(uv, uv);
  if (d2 > r * r) {
    gl_FragColor = vec4(0.06, 0.06, 0.16, 1.0);
    return;
  }

  float z = sqrt(r * r - d2);
  vec3 normal = normalize(vec3(uv, z));

  vec3 light1 = normalize(vec3(0.5, 0.8, 1.0));
  vec3 light2 = normalize(vec3(-0.5, -0.3, 0.7));
  vec3 viewDir = vec3(0.0, 0.0, 1.0);

  // Metallic reflection
  vec3 reflectDir = reflect(-viewDir, normal);
  float spec1 = pow(max(dot(reflect(light1, normal), viewDir), 0.0), 64.0);
  float spec2 = pow(max(dot(reflect(light2, normal), viewDir), 0.0), 64.0);

  float diff1 = max(dot(normal, light1), 0.0);
  float diff2 = max(dot(normal, light2), 0.0);

  float hue = uv.x * 0.5 + 0.5;
  vec3 baseColor = hsv2rgb(vec3(hue, 1.0, 1.0));

  vec3 diffuseColor = baseColor * (0.1 + diff1 * 0.5 + diff2 * 0.3);
  vec3 specularColor = vec3(1.0) * (spec1 * 0.9 + spec2 * 0.4);

  vec3 color = mix(diffuseColor, specularColor, u_metalness);

  gl_FragColor = vec4(color, 1.0);
}
