// Professional kaleidoscope — polar folding into wedges with three mirror
// modes (reflect / rotate / butterfly), soft wedge seams, and color boost.
#ifdef GL_ES
precision mediump float;
#else
precision highp float;
#endif
uniform sampler2D u_texture;
uniform vec2 u_videoSize;
uniform float u_slices;
uniform float u_rotation;
uniform float u_saturation;
uniform float u_mirror_mode; // 0 reflect, 1 rotate, 2 butterfly

void main() {
  vec2 uv = gl_FragCoord.xy / u_videoSize;
  vec2 centered = uv - 0.5;
  centered.x *= u_videoSize.x / u_videoSize.y; // keep the wedge pattern circular

  float angle = atan(centered.y, centered.x) + u_rotation;
  float radius = length(centered);
  float wedge = 6.2831853 / max(1.0, floor(u_slices));

  if (u_mirror_mode < 0.5) {
    // Reflect — classic mirrored wedge
    angle = mod(angle, wedge);
    angle = abs(angle - wedge * 0.5);
  } else if (u_mirror_mode < 1.5) {
    // Rotate — copies tile the circle without mirroring
    angle = mod(angle, wedge);
  } else {
    // Butterfly — mirrored wedge plus a mirrored radius for wing symmetry
    angle = mod(angle, wedge);
    angle = abs(angle - wedge * 0.5);
    radius = abs(radius - 0.55);
  }

  vec2 folded = vec2(cos(angle), sin(angle)) * radius;
  folded.x /= u_videoSize.x / u_videoSize.y;
  vec3 col = texture2D(u_texture, clamp(folded + 0.5, 0.0, 1.0)).rgb;

  // Soft wedge seams — gently darken the fold lines
  float seamDist = mod(angle - u_rotation, wedge);
  seamDist = min(seamDist, wedge - seamDist);
  col *= mix(0.45, 1.0, smoothstep(0.02, 0.08, seamDist));

  if (u_mirror_mode > 1.5) {
    // Soft seam along the butterfly radius fold
    col *= mix(0.5, 1.0, smoothstep(0.01, 0.05, abs(radius - 0.55)));
  }

  // Color boost — push vivid pixels further from gray
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, col * (lum * 1.8 + 0.3), u_saturation);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
