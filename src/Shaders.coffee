# TODO: Create functions that construct the appropriate shader

Shaders =

  # Vertex shader (same for all programs)
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
  
  linear: [
    "precision mediump float;",
    
    "uniform sampler2D u_tex;",
    "uniform vec2 u_extent;",
    
    "varying vec2 v_textureCoord;",
    
    "void main() {",
        "vec4 pixel_v = texture2D(u_tex, v_textureCoord);",
        
        "float min = u_extent[0];",
        "float max = u_extent[1];",
        
        "float pixel = (pixel_v[0] - min) / (max - min);",
        
        "gl_FragColor = vec4(pixel, pixel, pixel, 1.0);",
    "}"
  ].join("\n")
  
  logarithm: [
    "precision mediump float;"
    
    "uniform sampler2D u_tex;",
    "uniform vec2 u_extent;",
    
    "varying vec2 v_textureCoord;",

    "float logarithm(float value) {",
        "return log(value / 0.05 + 1.0) / log(1.0 / 0.05 + 1.0);",
    "}",

    "void main() {",
        "vec4 pixel_v = texture2D(u_tex, v_textureCoord);",
        
        "float min = u_extent[0];",
        "float max = u_extent[1];",
        
        "max = max - min;",
        
        "float minScaled = logarithm(0.0);",
        "max = logarithm(max);",
        "float pixel = pixel_v[0] - min;",
        "pixel = logarithm(pixel);",
        
        "pixel = (pixel - minScaled) / (max - minScaled);",
        
        "gl_FragColor = vec4(pixel, pixel, pixel, 1.0);",
    "}"
  ].join("\n")
  
  sqrt: [
    "precision mediump float;"
    
    "uniform sampler2D u_tex;",
    "uniform vec2 u_extent;",
    
    "varying vec2 v_textureCoord;",

    "void main() {",
      "vec4 pixel_v = texture2D(u_tex, v_textureCoord);",
      
      # Shift value by min to avoid negative numbers
      "float min = u_extent[0];",
      "float max = u_extent[1] - min;",
      "float pixel = pixel_v[0] - min;",
      
      "pixel = sqrt(pixel_v[0] / max);",
      
      "gl_FragColor = vec4(pixel, pixel, pixel, 1.0);",
    "}"
  ].join("\n")
  
  arcsinh: [
    "precision mediump float;"
    
    "uniform sampler2D u_tex;",
    "uniform vec2 u_extent;",
    
    "varying vec2 v_textureCoord;",

    "float arcsinh(float value) {",
        "return log(value + sqrt(1.0 + value * value));",
    "}",
    
    "float scaledArcsinh(float value) {",
        "return arcsinh(value / -0.033) / arcsinh(1.0 / -0.033);",
    "}",

    "void main() {",
      "vec4 pixel_v = texture2D(u_tex, v_textureCoord);",
      
      "float min = scaledArcsinh(u_extent[0]);",
      "float max = scaledArcsinh(u_extent[1]);",
      "float value = scaledArcsinh(pixel_v[0]);",
      
      "float pixel = (value - min) / (max - min);",

      "gl_FragColor = vec4(pixel, pixel, pixel, 1.0);",
    "}"
  ].join("\n")
  
  power: [
    "precision mediump float;"
    
    "uniform sampler2D u_tex;",
    "uniform vec2 u_extent;",
    
    "varying vec2 v_textureCoord;",

    "void main() {",
      "vec4 pixel_v = texture2D(u_tex, v_textureCoord);",

      # Shift value by min to avoid negative numbers
      "float min = u_extent[0];",
      "float max = u_extent[1] - min;",
      "float pixel = pixel_v[0] - min;",
      
      "pixel = pow(pixel / max, 2.0);",

      "gl_FragColor = vec4(pixel, pixel, pixel, 1.0);",
    "}"
  ].join("\n")
  
  fragment: [
      "precision mediump float;"

      "uniform sampler2D u_tex;",
      "uniform vec2 u_extent;",

      "varying vec2 v_textureCoord;",

      "float arcsinh(float value) {",
          "return log(value + sqrt(1.0 + value * value));",
      "}",

      "float scaledArcsinh(float value) {",
          "return arcsinh(value / -0.033) / arcsinh(1.0 / -0.033);",
      "}",

      "void main() {",
        "vec4 pixel_v = texture2D(u_tex, v_textureCoord);",

        "float min = scaledArcsinh(u_extent[0]);",
        "float max = scaledArcsinh(u_extent[1]);",
        "float value = scaledArcsinh(pixel_v[0]);",

        "float pixel = (value - min) / (max - min);",

        "gl_FragColor = vec4(pixel, pixel, pixel, 1.0);",
      "}"
    ].join("\n")
  
  color: (identifier1, identifier2, identifier3) ->
    [
      "precision mediump float;"
      
      "uniform sampler2D u_tex1;"
      "uniform sampler2D u_tex2;"
      "uniform sampler2D u_tex3;"
      
      "uniform float u_#{identifier1}_scale;"
      "uniform float u_#{identifier2}_scale;"
      "uniform float u_#{identifier3}_scale;"
      
      "uniform float u_alpha;"
      "uniform float u_Q;"
      
      "varying vec2 v_textureCoord;"
      
      "float arcsinh(float value) {"
        "return log(value + sqrt(1.0 + value * value));"
      "}"
      
      "void main() {"
        # Get the pixel intensities from textures
        "vec4 pixel_v_b = texture2D(u_tex1, v_textureCoord);"
        "vec4 pixel_v_g = texture2D(u_tex2, v_textureCoord);"
        "vec4 pixel_v_r = texture2D(u_tex3, v_textureCoord);"
        
        # Store the current pixel value for each texture, background subtract, and apply scale
        "float r = (pixel_v_r[0]) * u_#{identifier1}_scale;"
        "float g = (pixel_v_g[0]) * u_#{identifier2}_scale;"
        "float b = (pixel_v_b[0]) * u_#{identifier3}_scale;"
        
        # Compute the total intensity and stretch factor
        "float I = r + g + b + 1e-10;",
        "float factor = arcsinh(u_alpha * u_Q * I) / (u_Q * I);"
        
        # Apply stretch factor to scaled pixels
        "float R = clamp(r * factor, 0.0, 1.0);"
        "float G = clamp(g * factor, 0.0, 1.0);"
        "float B = clamp(b * factor, 0.0, 1.0);"
        
        "gl_FragColor = vec4(R, G, B, 1.0);"
      "}"
    ].join("\n")


@astro.WebFITS.Shaders = Shaders