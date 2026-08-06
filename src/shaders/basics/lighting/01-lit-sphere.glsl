#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_roughness;

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);

  vec3 lightDir = normalize(vec3(0.5, 0.8, 1.0));

  // Sphere intersection
  float r = 0.5;
  vec2 sp = uv;
  float d2 = dot(sp, sp);
  if (d2 > r * r) {
    gl_FragColor = vec4(0.06, 0.06, 0.16, 1.0);
    return;
  }

  float z = sqrt(r * r - d2);
  vec3 normal = normalize(vec3(sp, z));

  // Diffuse
  float diff = max(dot(normal, lightDir), 0.0);

  // Specular (Blinn-Phong)
  vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfDir), 0.0), (1.0 - u_roughness) * 128.0 + 1.0);

  // Ambient
  float ambient = 0.1;

  // Rim light (Fresnel)
  float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 4.0);

  vec3 albedo = vec3(0.3, 0.5, 0.9);
  vec3 color = albedo * (ambient + diff) + spec * 0.8 + fresnel * vec3(0.3, 0.6, 0.9) * 0.4;

  gl_FragColor = vec4(color, 1.0);
}
