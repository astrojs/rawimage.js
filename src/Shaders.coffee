# TODO: Create functions that construct the appropriate shader

Shaders =
  
  # Vertex shader (same for all programs)
  vertex: [
    "attribute vec2 a_position;"
    "attribute vec2 a_textureCoord;"
    
    "uniform vec2 u_offset;"
    "uniform float u_scale;"
    
    "varying vec2 v_textureCoord;"
    
    "void main() {"
      "vec2 position = a_position + u_offset;"
      "position = position * u_scale;"
      "gl_Position = vec4(position, 0.0, 1.0);"
      
      # Pass coordinate to fragment shader
      "v_textureCoord = a_textureCoord;"
    "}"
  ].join("\n")
  
  linear: [
    "precision mediump float;"
    
    "uniform sampler2D u_tex;"
    "uniform vec2 u_extent;"
    "uniform vec3 u_color;"
    
    "varying vec2 v_textureCoord;"
    
    "void main() {"
        "vec4 pixel_v = texture2D(u_tex, v_textureCoord);"
        
        "float min = u_extent[0];"
        "float max = u_extent[1];"
        
        "vec3 pixel = (pixel_v.rgb - min) / (max - min);"
        "gl_FragColor = vec4(pixel * u_color, 1.0);"
    "}"
  ].join("\n")
  
  logarithm: [
    "precision mediump float;"
    
    "uniform sampler2D u_tex;"
    "uniform vec2 u_extent;"
    "uniform vec3 u_color;"
    
    "varying vec2 v_textureCoord;"
    
    "float logarithm(float value) {"
        "return log(value / 0.05 + 1.0) / log(1.0 / 0.05 + 1.0);"
    "}"
    
    "void main() {"
        "vec4 pixel_v = texture2D(u_tex, v_textureCoord);"
        
        "float min = u_extent[0];"
        "float max = logarithm(u_extent[1] - min);"
        
        "float logMin = logarithm(0.0);"
        "float pixel = pixel_v[0] - min;"
        "pixel = logarithm(pixel);"
        
        "pixel = (pixel - logMin) / (max - logMin);"
        
        "gl_FragColor = vec4( vec3(pixel, pixel, pixel) * u_color, 1.0);"
    "}"
  ].join("\n")
  
  sqrt: [
    "precision mediump float;"
    
    "uniform sampler2D u_tex;"
    "uniform vec2 u_extent;"
    "uniform vec3 u_color;"
    
    "varying vec2 v_textureCoord;"
    
    "void main() {"
      "vec4 pixel_v = texture2D(u_tex, v_textureCoord);"
      
      # Shift value by min to avoid negative numbers
      "float min = u_extent[0];"
      "float max = u_extent[1] - min;"
      "float pixel = pixel_v[0] - min;"
      
      "pixel = sqrt(pixel_v[0] / max);"
      
      "gl_FragColor = vec4( vec3(pixel, pixel, pixel) * u_color, 1.0);"
    "}"
  ].join("\n")
  
  arcsinh: [
    "precision mediump float;"
    
    "uniform sampler2D u_tex;"
    "uniform vec2 u_extent;"
    "uniform vec3 u_color;"
    
    "varying vec2 v_textureCoord;"
    
    "float arcsinh(float value) {"
        "return log(value + sqrt(1.0 + value * value));"
    "}",
    
    "void main() {"
      "vec4 pixel_v = texture2D(u_tex, v_textureCoord);"
      
      "float min = 0.0;"
      "float max = arcsinh( u_extent[1] - u_extent[0] );"
      "float value = arcsinh( pixel_v[0] - u_extent[0] );"
      
      "float pixel = value / max;"
      
      "gl_FragColor = vec4( vec3(pixel, pixel, pixel) * u_color, 1.0);"
    "}"
  ].join("\n")
  
  power: [
    "precision mediump float;"
    
    "uniform sampler2D u_tex;"
    "uniform vec2 u_extent;"
    "uniform vec3 u_color;"
    
    "varying vec2 v_textureCoord;"
    
    "void main() {",
      "vec4 pixel_v = texture2D(u_tex, v_textureCoord);"
      
      # Shift value by min to avoid negative numbers
      "float min = u_extent[0];"
      "float max = u_extent[1] - min;"
      "float pixel = pixel_v[0] - min;"
      
      "pixel = pow(pixel / max, 2.0);"
      
      "gl_FragColor = vec4( vec3(pixel, pixel, pixel) * u_color, 1.0);"
    "}"
  ].join("\n")
  
  color: [
    "precision mediump float;"
    
    "uniform sampler2D u_tex0;"
    "uniform sampler2D u_tex1;"
    "uniform sampler2D u_tex2;"
    
    "uniform float u_r_scale;"
    "uniform float u_g_scale;"
    "uniform float u_b_scale;"
    
    "uniform float u_r_calibration;"
    "uniform float u_g_calibration;"
    "uniform float u_b_calibration;"
    
    "uniform float u_alpha;"
    "uniform float u_Q;"
    
    "varying vec2 v_textureCoord;"
    
    "float arcsinh(float value) {"
      "return log(value + sqrt(1.0 + value * value));"
    "}"
    
    "void main() {"
      # Get the pixel intensities from textures
      "vec4 pixel_v_r = texture2D(u_tex0, v_textureCoord);"
      "vec4 pixel_v_g = texture2D(u_tex1, v_textureCoord);"
      "vec4 pixel_v_b = texture2D(u_tex2, v_textureCoord);"
      
      # Calibrate pixels to flux units and apply scale
      "float r = (pixel_v_r[0]) * u_r_calibration * u_r_scale;"
      "float g = (pixel_v_g[0]) * u_g_calibration * u_g_scale;"
      "float b = (pixel_v_b[0]) * u_b_calibration * u_b_scale;"
      
      # Compute the total intensity and stretch factor
      "float I = r + g + b + 1e-10;"
      "float factor = arcsinh(u_alpha * u_Q * I) / (u_Q * I);"
      
      # Apply stretch factor to scaled pixels
      "float R = clamp(r * factor, 0.0, 1.0);"
      "float G = clamp(g * factor, 0.0, 1.0);"
      "float B = clamp(b * factor, 0.0, 1.0);"
      
      "gl_FragColor = vec4(R, G, B, 1.0);"
    "}"
  ].join("\n")


@astro.WebFITS.Shaders = Shaders