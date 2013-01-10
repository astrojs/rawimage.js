Shaders =

  vertex: [
    "attribute vec2 a_position;",
    "attribute vec2 a_textureCoord;",

    "uniform vec2 u_offset;",
    "uniform float u_scale;",

    "varying vec2 v_textureCoord;",

    "void main() {",
      "vec2 position = a_position + u_offset;",
      "position = position * u_scale;",
      "gl_Position = vec4(position, 0.0, 1.0);",
      
      # Pass coordinate to fragment shader
      "v_textureCoord = a_textureCoord;",
    "}"
  ].join("\n")

  fragment: [
    "precision mediump float;",

    "uniform sampler2D u_tex;",
    "uniform vec2 u_extent;",

    "varying vec2 v_textureCoord;",

    "float arcsinh(float value) {",
        "return log(value + sqrt(1.0 + value * value));",
    "}",

    "void main() {",
        "vec4 pixel_v = texture2D(u_tex, v_textureCoord);",

        "float min = arcsinh(u_extent[0]);",
        "float max = arcsinh(u_extent[1]);",
        "float value = arcsinh(pixel_v[0]);",

        "float pixel = (value - min) / (max - min);",

        "gl_FragColor = vec4(pixel, pixel, pixel, 1.0);",
    "}"
  ].join("\n")
  
  lupton: [
    "precision mediump float;",
    
    "uniform sampler2D u_tex1;",
    "uniform sampler2D u_tex2;",
    "uniform sampler2D u_tex3;",
    
    "uniform float u_gsky;",
    "uniform float u_rsky;",
    "uniform float u_isky;",
    
    "uniform float u_gscale;",
    "uniform float u_rscale;",
    "uniform float u_iscale;",
    
    "uniform float u_alpha;",
    "uniform float u_Q;",
    
    "varying vec2 v_textureCoord;",
    
    "float arcsinh(float value) {",
      "return log(value + sqrt(1.0 + value * value));",
    "}",
    
    "void main() {",
      # Get the pixel intensities from textures
      "vec4 pixel_v_g = texture2D(u_tex1, v_textureCoord);",
      "vec4 pixel_v_r = texture2D(u_tex2, v_textureCoord);",
      "vec4 pixel_v_i = texture2D(u_tex3, v_textureCoord);",
      
      # Store the current pixel value for each texture, background subtract, and apply scale
      "float r = (pixel_v_i[0] - u_isky) * u_iscale;",
      "float g = (pixel_v_r[0] - u_rsky) * u_rscale;",
      "float b = (pixel_v_g[0] - u_gsky) * u_gscale;",
      
      # Compute the total intensity and stretch factor
      "float I = r + g + b + 1e-10;",
      "float factor = arcsinh(u_alpha * u_Q * I) / (u_Q * I);",
      
      # Apply stretch factor to scaled pixels
      "float R = clamp(r * factor, 0.0, 1.0);",
      "float G = clamp(g * factor, 0.0, 1.0);",
      "float B = clamp(b * factor, 0.0, 1.0);",
      
      "gl_FragColor = vec4(R, G, B, 1.0);",
    "}"
  ].join("\n")
  
  stiff: [
    "precision mediump float;",

    "uniform sampler2D u_tex0;",
    "uniform sampler2D u_tex1;",
    "uniform sampler2D u_tex2;",
    
    "uniform vec2 u_extremes;",
    
    "uniform float u_gscale;",
    "uniform float u_rscale;",
    "uniform float u_iscale;",
    
    "uniform float u_gsky;",
    "uniform float u_rsky;",
    "uniform float u_isky;",
    
    "uniform float u_gmax;",
    "uniform float u_rmax;",
    "uniform float u_imax;",

    "uniform float u_alpha;",
    "uniform float u_Q;",
    
    "uniform float u_colorsat;",

    "varying vec2 v_textureCoord;",

    "float arcsinh(float value) {",
      "return log(value + sqrt(1.0 + value * value));",
    "}",
    
    "float lupton_asinh(float mean, float Q, float alpha) {",
      "return arcsinh(alpha * Q * mean) / (Q * mean);"
    "}",
    
    "void main() {",
      # Get the pixel intensities from textures
      "vec4 pixel_v_g = texture2D(u_tex0, v_textureCoord);",
      "vec4 pixel_v_r = texture2D(u_tex1, v_textureCoord);",
      "vec4 pixel_v_i = texture2D(u_tex2, v_textureCoord);",
      
      # Store the current pixel value for each texture and apply scale
      "float r = pixel_v_i[0] * u_iscale;",
      "float g = pixel_v_r[0] * u_rscale;",
      "float b = pixel_v_g[0] * u_gscale;",
      
      # Set some parameters
      "float grey = 0.001;",
      "float gammafac = 1.0;",
      "float greygf = pow(grey, gammafac);",
      
      # Compute min level from sky, grey and max level
      # TODO: Move to JavaScript, this computation should only be done once by the CPU
      "float rmin = (u_isky - greygf * u_imax) / (1. - greygf);",
      "float gmin = (u_rsky - greygf * u_rmax) / (1. - greygf);",
      "float bmin = (u_gsky - greygf * u_gmax) / (1. - greygf);",
      
      # Compute the sum and factor
      "float I = r + g + b + 1e-10;",
      "float Y = (r + g + b) / 3.0;",
      "float factor = lupton_asinh(Y, u_Q, u_alpha);",
      
      # Apply factor
      "float R = r * factor;",
      "float G = g * factor;",
      "float B = b * factor;",
      
      # Apply saturation parameter
      "float R1 = I + u_colorsat * (2.0 * R - G - B);",
      "float G1 = I + u_colorsat * (2.0 * G - R - B);",
      "float B1 = I + u_colorsat * (2.0 * B - R - G);",
      
      "gl_FragColor = vec4(R1, G1, B1, 1.0);",
    "}"
  ].join("\n")

@astro.WebFITS.Shaders = Shaders