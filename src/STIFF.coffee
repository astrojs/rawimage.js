
# Implementation of Emmanuel Bertin's STIFF algorithm
# http://www.astromatic.net/software/stiff

Shaders.STIFF: [
  "precision mediump float;"
  
  "uniform sampler2D u_tex0;"
  "uniform sampler2D u_tex1;"
  "uniform sampler2D u_tex2;"
  
  "void main() {"
    # Get the pixel intensities from textures
    "vec4 pixel_v_r = texture2D(u_tex0, v_textureCoord);"
    "vec4 pixel_v_g = texture2D(u_tex1, v_textureCoord);"
    "vec4 pixel_v_b = texture2D(u_tex2, v_textureCoord);"
    
    # Store the current pixel value for each texture, background subtract, and apply scale
    "float r = (pixel_v_r[0]);"
    "float g = (pixel_v_g[0]);"
    "float b = (pixel_v_b[0]);"
    
    # Compute the total intensity and stretch factor
    "float I = (r + g + b) / 3.0;"
    
    "gl_FragColor = vec4(R, G, B, 1.0);"
  "}"
].join('\n')