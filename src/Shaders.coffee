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
      "float r = (pixel_v_i[0]) * u_iscale;",
      "float g = (pixel_v_r[0]) * u_rscale;",
      "float b = (pixel_v_g[0]) * u_gscale;",
      
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


@astro.WebFITS.Shaders = Shaders