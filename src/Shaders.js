
rawimage.shaders = {
  
  // Same vertex shader for all programs
  vertex: [
    "attribute vec2 aPosition;",
    "attribute vec2 aTextureCoordinate;",
    
    "uniform vec2 uOffset;",
    "uniform float uScale;",
    
    "varying vec2 vTextureCoordinate;",
    
    "void main() {",
      "vec2 position = aPosition + uOffset;",
      "position = position * uScale;",
      "gl_Position = vec4(position, 0.0, 1.0);",
      
      "vTextureCoordinate = aTextureCoordinate;",
    "}"
  ].join('\n'),
  
  linear: [
    "precision mediump float;",
    
    "uniform sampler2D uTexture;",
    "uniform sampler2D uColorMap;",
    "uniform float uColorIndex;",
    "uniform vec2 uExtent;",
    
    "varying vec2 vTextureCoordinate;",
    
    "void main() {",
        "vec4 pixel_v = texture2D(uTexture, vTextureCoordinate);",
        
        "float min = uExtent[0];",
        "float max = uExtent[1];",
        
        "float x = (pixel_v.r - min) / (max - min);",
        "gl_FragColor = texture2D( uColorMap, vec2(x, uColorIndex / 70.0) );",
    "}"
  ].join("\n"),
  
  logarithm: [
    "precision mediump float;",
    
    "uniform sampler2D uTexture;",
    "uniform sampler2D uColorMap;",
    "uniform float uColorIndex;",
    "uniform vec2 uExtent;",
    
    "varying vec2 vTextureCoordinate;",
    
    "float logarithm(float value) {",
        "return log(value / 0.05 + 1.0) / log(1.0 / 0.05 + 1.0);",
    "}",
    
    "void main() {",
        "vec4 pixel_v = texture2D(uTexture, vTextureCoordinate);",
        
        "float min = uExtent[0];",
        "float max = logarithm(uExtent[1] - min);",
        
        "float logMin = logarithm(0.0);",
        "float pixel = logarithm(pixel_v[0] - min);",
        
        "float x = (pixel - logMin) / (max - logMin);",
        
        "gl_FragColor = texture2D( uColorMap, vec2(x, uColorIndex / 70.0) );",
    "}"
  ].join("\n"),
  
  sqrt: [
    "precision mediump float;",
    
    "uniform sampler2D uTexture;",
    "uniform sampler2D uColorMap;",
    "uniform float uColorIndex;",
    "uniform vec2 uExtent;",
    
    "varying vec2 vTextureCoordinate;",
    
    "void main() {",
      "vec4 pixel_v = texture2D(uTexture, vTextureCoordinate);",
      
      // Shift value by min to avoid negative numbers
      "float min = uExtent[0];",
      "float max = uExtent[1] - min;",
      
      "float x = sqrt( (pixel_v[0] - min) / max);",
      
      "gl_FragColor = texture2D( uColorMap, vec2(x, uColorIndex / 70.0) );",
    "}"
  ].join("\n"),
  
  arcsinh: [
    "precision mediump float;",
    
    "uniform sampler2D uTexture;",
    "uniform sampler2D uColorMap;",
    "uniform float uColorIndex;",
    "uniform vec2 uExtent;",
    
    "varying vec2 vTextureCoordinate;",
    
    "float arcsinh(float value) {",
        "return log(value + sqrt(1.0 + value * value));",
    "}",
    
    "void main() {",
      "vec4 pixel_v = texture2D(uTexture, vTextureCoordinate);",
      
      "float min = 0.0;",
      "float max = arcsinh( uExtent[1] - uExtent[0] );",
      
      "float x = arcsinh( pixel_v[0] - uExtent[0] ) / max;",
      
      "gl_FragColor = texture2D( uColorMap, vec2(x, uColorIndex / 70.0) );",
    "}"
  ].join("\n"),
  
  power: [
    "precision mediump float;",
    
    "uniform sampler2D uTexture;",
    "uniform sampler2D uColorMap;",
    "uniform float uColorIndex;",
    "uniform vec2 uExtent;",
    
    "varying vec2 vTextureCoordinate;",
    
    "void main() {",
      "vec4 pixel_v = texture2D(uTexture, vTextureCoordinate);",
      
      // Shift value by min to avoid negative numbers
      "float min = uExtent[0];",
      "float max = pow(uExtent[1] - min, 2.0);",
      
      "float pixel = pow(pixel_v[0] - min, 2.0);",
      "float x = pixel / max;",
      
      "gl_FragColor = texture2D( uColorMap, vec2(x, uColorIndex / 70.0) );",
    "}"
  ].join("\n"),
  
  color: [
    "precision mediump float;",
    
    "uniform sampler2D uTexture0;",
    "uniform sampler2D uTexture1;",
    "uniform sampler2D uTexture2;",
    
    "uniform float uScaleR;",
    "uniform float uScaleG;",
    "uniform float uScaleB;",
    
    "uniform float uCalibrationR;",
    "uniform float uCalibrationG;",
    "uniform float uCalibrationB;",
    
    "uniform float uAlpha;",
    "uniform float uQ;",
    
    "varying vec2 vTextureCoordinate;",
    
    "float arcsinh(float value) {",
      "return log(value + sqrt(1.0 + value * value));",
    "}",
    
    "void main() {",
      // Get the pixel intensities from textures
      "vec4 pixel_v_r = texture2D(uTexture0, vTextureCoordinate);",
      "vec4 pixel_v_g = texture2D(uTexture1, vTextureCoordinate);",
      "vec4 pixel_v_b = texture2D(uTexture2, vTextureCoordinate);",
      
      // Calibrate pixels to flux units and apply scale
      "float r = (pixel_v_r[0]) * uCalibrationR * uScaleR;",
      "float g = (pixel_v_g[0]) * uCalibrationG * uScaleG;",
      "float b = (pixel_v_b[0]) * uCalibrationB * uScaleB;",
      
      // Compute the total intensity and stretch factor
      "float I = r + g + b + 1e-10;",
      "float factor = arcsinh(uAlpha * uQ * I) / (uQ * I);",
      
      // Apply stretch factor to scaled pixels
      "float R = clamp(r * factor, 0.0, 1.0);",
      "float G = clamp(g * factor, 0.0, 1.0);",
      "float B = clamp(b * factor, 0.0, 1.0);",
      
      "gl_FragColor = vec4(R, G, B, 1.0);",
    "}"
  ].join("\n")
};
