RawImage = (function(){  
  // Initialize a ra
  function RawImage(el, width, height) {
    var canvasStyle, overlayStyle, parentStyle;
    
    this.el = el;
    this.width = width;
    this.height = height;
    this.reset();
    
    // Createa a WebGL canvas
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('width', width);
    this.canvas.setAttribute('height', height);
    this.canvas.setAttribute('class', 'rawimage-gl');
    
    // Create an overlay canvas (e.g. annotations or crosshair)
    this.overlay = document.createElement('canvas');
    this.overlay.setAttribute('width', width);
    this.overlay.setAttribute('height', height);
    this.overlay.setAttribute('class', 'rawimage-overlay');
    this.overlayCtx = this.overlay.getContext('2d');
    
    this.el.appendChild(this.canvas);
    this.el.appendChild(this.overlay);
    
    // Set GL specific properties
    if (!this.setupGLContext()) return null;
    this.hasFragmentShader = false;
    this.textureAddress = 1;
    this.textureLookupFnAddress = 8;
    this.uniformKeys = ['uOffset', 'uScale', 'uExtent', 'uColorIndex', 'uColorMap', 'uXTiles', 'uYTiles'];
    
    // Position the canvases
    parentStyle = this.canvas.parentElement.style;
    parentStyle.width = "" + this.canvas.width + "px";
    parentStyle.height = "" + this.canvas.height + "px";
    parentStyle.overflow = 'hidden';
    // parentStyle.backgroundColor = '#FF0000';
    parentStyle.backgroundColor = '#252525';
    parentStyle.position = 'relative';
    
    canvasStyle = this.canvas.style;
    canvasStyle.position = 'absolute';
    
    overlayStyle = this.overlay.style;
    overlayStyle.position = 'absolute';
    overlayStyle.pointerEvents = 'none';
    
    // Set parameters for mouse events
    this.xOffset = 0.0;
    this.yOffset = 0.0;
    this.xOldOffset = this.xOffset;
    this.yOldOffset = this.yOffset;
    this.drag = false;
    this.zoom = 1.0;
    this.minZoom = 0.125;
    this.maxZoom = 100.0;
    
    this.crosshair = false;
  };
  
  // Define or reset storage for various GL elements
  RawImage.prototype.reset = function() {
    this.programs = {};
    this.uniforms = {};
    this.attributes = {};
    this.textures = {};
    this.buffers = {};
    this.shaders = [];
    
    // Always starting with the colormap texture
    this.nTextures = 1;
    
    // Texture lookup table for referencing user specified identifiers with a GL texture index
    this.textureLookup = {};
    this.textureKeys = ['uColorMap'];
  };
  
  // Release all objects on the GPU
  // TODO: Make functions to release specific texture/program/buffer
  RawImage.prototype.destroy = function() {
    var item;
    
    // Delete textures
    for (item in this.textures) {
      this.gl.deleteTexture(this.textures[item]);
    }
    
    // Delete buffers
    this.buffers.forEach(function(item) {
      this.gl.deleteBuffer(item);
    }, this);
    
    // Delete shaders
    this.shaders.forEach(function(item) {
      this.gl.deleteShader(item);
    }, this);
    
    // Delete programs
    for (item in this.programs) {
      this.gl.deleteProgram(this.programs[item]);
    }
    
    this.gl = undefined;
    this.reset();
  };
  
  RawImage.shaders = {
    
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
    ].join(''),
    
    getPixelFromTile: [
      "vec4 getPixelFromTile(vec2 textureCoordinate) {",
        "vec4 pixel;",
  
        "float dx = 1.0 / uXTiles;",
        "float dy = 1.0 / uYTiles;",
  
        "vec2 delta = vec2(dx, dy);",
        "vec2 scaledPosition;",
    ],
    
    linear: [
      "precision mediump float;",
    
      "uniform sampler2D uTexture00;",
      "uniform sampler2D uColorMap;",
      "uniform float uColorIndex;",
      "uniform vec2 uExtent;",
      "uniform float uXTiles;",
      "uniform float uYTiles;",
      
      "varying vec2 vTextureCoordinate;",
      
      "void main() {",
        "vec4 pixel_v = getPixelFromTile(vTextureCoordinate);",
        
        "float min = uExtent[0];",
        "float max = uExtent[1];",
        
        "float x = (pixel_v.r - min) / (max - min);",
        "gl_FragColor = texture2D( uColorMap, vec2(x, uColorIndex / 70.0) );",
      "}"
    ],
    
    logarithm: [
      "precision mediump float;",
      
      "uniform sampler2D uTexture00;",
      "uniform sampler2D uColorMap;",
      "uniform float uColorIndex;",
      "uniform vec2 uExtent;",
      "uniform float uXTiles;",
      "uniform float uYTiles;",
      
      "varying vec2 vTextureCoordinate;",
      
      "float logarithm(float value) {",
          "return log(value / 0.05 + 1.0) / log(1.0 / 0.05 + 1.0);",
      "}",
      
      "void main() {",
          "vec4 pixel_v = getPixelFromTile(vTextureCoordinate);",
          
          "float min = uExtent[0];",
          "float max = logarithm(uExtent[1] - min);",
          
          "float logMin = logarithm(0.0);",
          "float pixel = logarithm(pixel_v[0] - min);",
          
          "float x = (pixel - logMin) / (max - logMin);",
          
          "gl_FragColor = texture2D( uColorMap, vec2(x, uColorIndex / 70.0) );",
      "}"
    ],
    
    sqrt: [
      "precision mediump float;",
      
      "uniform sampler2D uTexture0;",
      "uniform sampler2D uColorMap;",
      "uniform float uColorIndex;",
      "uniform vec2 uExtent;",
      
      "varying vec2 vTextureCoordinate;",
      
      "void main() {",
        "vec4 pixel_v = texture2D(uTexture0, vTextureCoordinate);",
        
        // Shift value by min to avoid negative numbers
        "float min = uExtent[0];",
        "float max = uExtent[1] - min;",
        
        "float x = sqrt( (pixel_v[0] - min) / max);",
        
        "gl_FragColor = texture2D( uColorMap, vec2(x, uColorIndex / 70.0) );",
      "}"
    ].join(""),
    
    arcsinh: [
      "precision mediump float;",
      
      "uniform sampler2D uTexture0;",
      "uniform sampler2D uColorMap;",
      "uniform float uColorIndex;",
      "uniform vec2 uExtent;",
      
      "varying vec2 vTextureCoordinate;",
      
      "float arcsinh(float value) {",
          "return log(value + sqrt(1.0 + value * value));",
      "}",
      
      "void main() {",
        "vec4 pixel_v = texture2D(uTexture0, vTextureCoordinate);",
        
        "float min = 0.0;",
        "float max = arcsinh( uExtent[1] - uExtent[0] );",
        
        "float x = arcsinh( pixel_v[0] - uExtent[0] ) / max;",
        
        "gl_FragColor = texture2D( uColorMap, vec2(x, uColorIndex / 70.0) );",
      "}"
    ].join(""),
    
    power: [
      "precision mediump float;",
      
      "uniform sampler2D uTexture0;",
      "uniform sampler2D uColorMap;",
      "uniform float uColorIndex;",
      "uniform vec2 uExtent;",
      
      "varying vec2 vTextureCoordinate;",
      
      "void main() {",
        "vec4 pixel_v = texture2D(uTexture0, vTextureCoordinate);",
        
        // Shift value by min to avoid negative numbers
        "float min = uExtent[0];",
        "float max = pow(uExtent[1] - min, 2.0);",
        
        "float pixel = pow(pixel_v[0] - min, 2.0);",
        "float x = pixel / max;",
        
        "gl_FragColor = texture2D( uColorMap, vec2(x, uColorIndex / 70.0) );",
      "}"
    ].join(""),
    
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
    ].join("")
  };
  
  RawImage.prototype.loadColorMap = function() {
    var img, x1, x2, y1, y2, texture, name, program, uColorMap;
    
    img = new Image();
    img.src = "data:image/png;base64," + RawImage.colormaps.base64;
    
    x1 = y1 = 0.0;
    x2 = 256, y2 = 70;
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), this.gl.STATIC_DRAW);
    
    this.gl.activeTexture(this.gl.TEXTURE0);
    
    texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.gl.RGB, this.gl.UNSIGNED_BYTE, img);
    
    for (name in this.programs) {
      if (name === 'color') continue; // Skip color program
      
      program = this.programs[name];
      this.gl.useProgram(program);
      
      uColorMap = this.uniforms[name].uColorMap;
      this.gl.uniform1i(uColorMap, 0);
    };
    
    // Switch back to current program
    this.gl.useProgram(this.programs[this.transfer]);
  };
  
  RawImage.colormaps = {
    base64: "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",
    Accent: 70,
    Blues: 69,
    BrBG: 68,
    BuGn: 67,
    BuPu: 66,
    CMRmap: 65,
    Dark2: 64,
    GnBu: 63,
    Greens: 62,
    Greys: 61,
    OrRd: 60,
    Oranges: 59,
    PRGn: 58,
    Paired: 57,
    Pastel1: 56,
    Pastel2: 55,
    PiYG: 54,
    PuBuGn: 53,
    PuBu: 52,
    PuOr: 51,
    PuRd: 50,
    Purples: 49,
    RdBu: 48,
    RdGy: 47,
    RdPu: 46,
    RdYlBu: 45,
    RdYlGn: 44,
    Reds: 43,
    Set1: 42,
    Set2: 41,
    Set3: 40,
    Spectral: 39,
    YlGnBu: 38,
    YlGn: 37,
    YlOrBr: 36,
    YlOrRd: 35,
    afmhot: 34,
    autumn: 33,
    binary: 32,
    bone: 31,
    brg: 30,
    bwr: 29,
    cool: 28,
    coolwarm: 27,
    copper: 26,
    cubehelix: 25,
    flag: 24,
    gist_earth: 23,
    gist_gray: 22,
    gist_heat: 21,
    gist_ncar: 20,
    gistainbow: 19,
    gist_stern: 18,
    gist_yarg: 17,
    gnuplot2: 16,
    gnuplot: 15,
    gray: 14,
    hot: 13,
    hsv: 12,
    jet: 11,
    ocean: 10,
    pink: 9,
    prism: 8,
    rainbow: 7,
    seismic: 6,
    spectral: 5,
    spring: 4,
    summer: 3,
    terrain: 2,
    winter: 1
  };
  // Setup panning and zooming with optional user-specified callbacks.
  // Callbacks may be used to capture coordinates or execute custom functionality
  // on mouse events. To specify opts without callbacks, pass either
  // undefined or an empty object {}.
  RawImage.prototype.setupControls = function(callbacks, opts) {
    var voidfn, onmousedown, onmousemove, onmouseout, onmouseover, onmouseup,
        target = this;
    
    // Create void function to use when user does not specify callbacks
    voidfn = function() { void 0; };
    
    // Check if callbacks are passed
    callbacks = callbacks === undefined ? {} : callbacks;
    
    // Redefine callbacks with void function if not passed by user
    callbacks.onmousedown = callbacks.onmousedown || voidfn;
    callbacks.onmouseup = callbacks.onmouseup || voidfn;
    callbacks.onmousemove = callbacks.onmousemove || voidfn;
    callbacks.onmouseout = callbacks.onmouseout || voidfn;
    callbacks.onmouseover = callbacks.onmouseover || voidfn;
    callbacks.onzoom = callbacks.onzoom || voidfn;
    
    // Event handlers for interactions
    this.canvas.onmousedown = function(e) {
      target.drag = true;
      target.xOldOffset = target.xOffset;
      target.yOldOffset = target.yOffset;
      target.xMouseDown = e.clientX;
      target.yMouseDown = e.clientY;
      
      callbacks.onmousedown.call(target, opts, e);
    };
    
    this.canvas.onmouseup = function(e) {
      var dx, dy;
      
      target.drag = false;
      if (target.xMouseDown === null) return;
      
      dx = e.clientX - target.xMouseDown;
      dy = e.clientY - target.yMouseDown;
      
      // TODO: Minor optimization, precompute width / zoom and height / zoom on zoom change.
      target.xOffset = target.xOldOffset + (dx / target.width / target.zoom * 2.0);
      target.yOffset = target.yOldOffset - (dy / target.height / target.zoom * 2.0);
      
      target.draw();
      
      callbacks.onmouseup.call(target, opts, e);
    };
    
    this.canvas.onmousemove = function(e) {
      var dx, dy, xOffset, yOffset, x, y;
      
      // TODO: Use void function to remove if statement
      if (target.crosshair) {
        target.xCurrent = e.layerX;
        target.yCurrent = e.layerY;
        target.drawCrosshair();
      }
      if (target.drag) {
        dx = e.clientX - target.xMouseDown;
        dy = e.clientY - target.yMouseDown;
        
        target.xOffset = target.xOldOffset + (dx / target.width / target.zoom * 2.0);
        target.yOffset = target.yOldOffset - (dy / target.height / target.zoom * 2.0);
        
        target.draw();
      }
      
      // Get the canvas pixel coordinates
      var canvasX = e.layerX;
      var canvasY = e.layerY;
      
      // Get the number of canvas pixels needed to fit the image when constrained by width
      // var heightCanvas = target.imageHeight * (this.width / target.imageHeight);
      var heightCanvas = target.imageHeight * (this.width / target.imageWidth);
      // Get the margin offset on the y axis
      var marginYOffset = heightCanvas - this.height;
      
      // The image width is initially fit into the canvas width
      var imageX = canvasX * (target.imageWidth / this.width);
      var imageY = canvasY * (target.imageWidth / this.width);
      // var imageY = (canvasY + marginYOffset) * (target.imageWidth / this.width);
      
      // Get the translation offset
      // Translation offsets are in clipspace units [0, 2]
      // These need to be converted to pixel units (e.g. [0, 2] -> [0, width])
      var translateX = (this.width / 2) * target.xOffset;
      var translateY = (this.height / 2) * target.yOffset;
      
      // Get offset associated with zoom
      var zoomOffsetX = 0.5 * (target.imageWidth - target.imageWidth / target.zoom);
      var zoomOffsetY = 0.5 * (this.height * (target.imageWidth / this.width) - (this.height / target.zoom) * (target.imageWidth / this.width));
      zoomOffsetY = target.imageHeight - this.height * (target.imageWidth / this.width) / target.zoom - zoomOffsetY
      
      // console.log(target.imageHeight - this.height * (target.imageWidth / this.width) / target.zoom - zoomOffsetY);
      // console.log(imageX / target.zoom - translateX + zoomOffsetX);
      // console.log(imageY / target.zoom - translateY - zoomOffsetY);
      // console.log(zoomOffsetY + imageY / target.zoom);
      
      var x = imageX / target.zoom - translateX + zoomOffsetX;
      var y = imageY / target.zoom + translateY + zoomOffsetY;
      
      console.log(x, y);
      /*
      var viewX = e.layerX;
      var viewY = e.layerY;
      
      // By default the image will be placed in the lower left corner of the canvas
      var imgX = viewX;
      var imgY = viewY;
      // var imgY = target.imageHeight - (this.height - viewY);
      
      // Translation offsets are in clipspace units [0, 2]
      // These need to be converted to pixel units (e.g. [0, 2] -> [0, width])
      var offsetX = (this.width / 2) * target.xOffset;
      var offsetY = (this.height / 2) * target.yOffset;
      
      // Get the image offset as a function of zoom
      var xZoomOffset = 0.5 * (target.imageWidth - target.imageWidth / target.zoom);
      var yZoomOffset = 0.5 * (target.imageWidth - target.imageWidth / target.zoom);
      
      // console.log(xZoomOffset + imgX / target.zoom - offsetX);
      console.log(yZoomOffset);
      
      var x = xZoomOffset + imgX / target.zoom - offsetX;
      
      // // Compute the coordinates in the image reference frame
      // xOffset = e.clientX - target.offsetLeft;
      // yOffset = e.clientY - target.offsetTop;
      // 
      // dx = -1 * (target.width / 2 - xOffset) / target.width / target.zoom * 2.0;
      // dy = (target.height / 2 - yOffset) / target.height / target.zoom * 2.0;
      // 
      // // TODO: Might be wiser to save (x, y) on rawimage object. This would
      // //       allow uniform behavior across all user-specified callbacks.
      // x = ((-1 * (target.xOffset + 0.5)) + dx) + 1.5 << 0;
      // y = ((-1 * (target.yOffset + 0.5)) + dy) + 1.5 << 0;
      */
      
      callbacks.onmousemove.call(target, x, y, opts, e);
    };
    this.canvas.onmouseout = function(e) {
      target.drag = false;
      callbacks.onmouseout.call(target, opts, e);
    };
    this.canvas.onmouseover = function(e) {
      target.drag = false;
      callbacks.onmouseover.call(target, opts, e);
    };
    
    onzoom = function(e) {
      var factor, uScale;
      
      e.preventDefault();
      factor = e.shiftKey ? 1.01 : 1.1;
      
      target.zoom *= (e.wheelDelta || e.deltaY) < 0 ? 1 / factor : factor;
      target.zoom = target.zoom > target.maxZoom ? target.maxZoom : target.zoom;
      target.zoom = target.zoom < target.minZoom ? target.minZoom : target.zoom;
      
      target.draw();
      callbacks.onzoom();
    };
    
    this.canvas.addEventListener('mousewheel', onzoom, false);
    this.canvas.addEventListener('wheel', onzoom, false);
  };
  
  // Toggle a cursor over the image.
  // TODO: This check might be avoidable by redefining a cursor function
  RawImage.prototype.setCursor = function() {
    this.overlay.width = this.overlay.width;
    this.crosshair = (type === 'crosshair' ? true : false);
  };
  
  RawImage.prototype.drawCrosshair = function() {
    
    // Reset the width to clear the canvas
    this.overlay.width = this.overlay.width;
    
    this.overlayCtx.lineWidth = 1;
    this.overlayCtx.strokeStyle = '#0071e5';
    
    this.overlayCtx.moveTo(0, this.yCurrent);
    this.overlayCtx.lineTo(this.width, this.yCurrent);
    this.overlayCtx.moveTo(this.xCurrent, 0);
    this.overlayCtx.lineTo(this.xCurrent, this.height);
    
    this.overlayCtx.stroke();
  };
  RawImage.prototype.fragmentShaders = ['linear', 'logarithm', 'sqrt', 'arcsinh', 'power', 'color'];
  
  // Get necessary WebGL extensions (e.g. floating point textures).
  RawImage.prototype.getExtension = function() {
    return this.gl.getExtension('OES_texture_float');
  };
  
  RawImage.prototype.loadShader = function(source, type) {
    var gl, shader, compiled, error;
    
    gl = this.gl;
    
    shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
      gl.deleteShader(shader);
      error = gl.getShaderInfoLog(shader);
      throw "Error compiling shader " + shader + ": " + error;
      return null;
    }
    this.shaders.push(shader);
    
    return shader;
  };
  
  RawImage.prototype.createProgram = function(vertexShader, fragmentShader) {
    var gl, linked, program;
    
    gl = this.gl;
    
    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked) {
      gl.deleteProgram(program);
      throw "Error in program linking: " + (gl.getProgramInfoLog(program));
      return null;
    }
    
    return program;
  };
  
  RawImage.prototype.updateUniforms = function() {
    var uniforms = this.uniforms[this.transfer];
    
    this.gl.uniform2f(uniforms.uOffset, this.xOffset, this.yOffset);
    this.gl.uniform1f(uniforms.uScale, this.zoom);
  };
  
  RawImage.prototype.setupGLContext = function() {
    var width, height, ext, vertexShader, fragmentShader, key, i, program, buffer;
    
    this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
    if (!this.gl) return false;
    
    width = this.width;
    height = this.height;
    this.gl.viewport(0, 0, width, height);
    
    ext = this.getExtension();
    if (!ext) return false;
    
    this.maximumTextureSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
    return true;
  }
  
  // The remainder of GL setup code depends on knowing the number of tiles needed
  // to display an image.
  RawImage.prototype.initGL = function(width, height, callback) {
    
    // Determine the number of tiles from the image dimensions
    var xTiles = this.xTiles = Math.ceil(width / this.maximumTextureSize);
    var yTiles = this.yTiles = Math.ceil(height / this.maximumTextureSize);
    
    // Create and compile shaders
    vertexShader = this.loadShader(RawImage.shaders.vertex, this.gl.VERTEX_SHADER);
    if (!vertexShader) return false;
    
    // Every transfer function needs it's own program
    // TODO: Test performance of using conditional check of transfer function on one program
    // TODO: Retrofit the other fragment shaders for tiling.
    ["linear", "logarithm"].forEach(function(transfer) {
      
      var fragmentShaderStr = this.createTiledFragmentShader(transfer, xTiles, yTiles);
      var fragmentShader = this.loadShader(fragmentShaderStr, this.gl.FRAGMENT_SHADER);
      if (!fragmentShader) return false;
      
      var program = this.createProgram(vertexShader, fragmentShader);
      if (!program) return false;
      this.programs[transfer] = program;
      this.gl.useProgram(program);
      
      // Look up and store uniform locations
      this.uniforms[transfer] = {};
      this.uniformKeys.forEach(function(key) {
        this.uniforms[transfer][key] = this.gl.getUniformLocation(program, key);
      }, this);
      
      // Set initial uniforms for current program
      this.gl.uniform1f(this.uniforms[transfer].uXTiles, xTiles);
      this.gl.uniform1f(this.uniforms[transfer].uYTiles, yTiles);
      this.gl.uniform2f(this.uniforms[transfer].uOffset, this.xOffset, this.yOffset);
      this.gl.uniform1f(this.uniforms[transfer].uScale, this.zoom);
      this.gl.uniform1f(this.uniforms[transfer].uColorIndex, RawImage.colormaps.binary - 0.5);
      
      // Get attribute locations
      this.attributes[transfer] = {};
      this.attributes[transfer]['aPosition'] = this.gl.getAttribLocation(program, 'aPosition');
      this.attributes[transfer]['aTextureCoordinate']  = this.gl.getAttribLocation(program, 'aTextureCoordinate');
    }, this);
    
    // Start with the linear transfer function
    this.transfer = 'linear';
    this.program = this.programs['linear'];
    this.gl.useProgram(this.program);
    
    // Create position and texture buffers
    var positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.enableVertexAttribArray(this.attributes[this.transfer]['aPosition']);
    this.gl.vertexAttribPointer(this.attributes[this.transfer]['aPosition'], 2, this.gl.FLOAT, false, 0, 0);
    this.buffers['position'] = positionBuffer;
    
    // Load the color map first using a clean buffer. Using a callback here to ensure instructions
    // sent to GPU synchronously.
    this.loadColorMap();
    
    // The position buffer is derived from canvas dimensions. Clipspace coordinates
    // must be computed. Start by working along a unit domain.
    var x1 = y1 = 0.0;
    var x2 = 1.0, y2 = this.canvas.width / this.canvas.height;
    
    // Transform to a [0, 2] domain
    x2 *= 2.0;
    y2 *= 2.0;
  
    // Transform to clipspace coordinates
    x1 -= 1.0;
    y1 -= 1.0;
    x2 -= 1.0;
    y2 -= 1.0;
  
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]),
      this.gl.STATIC_DRAW
    );
    this.gl.enableVertexAttribArray(this.attributes[this.transfer]['aPosition']);
    this.gl.vertexAttribPointer(this.attributes[this.transfer]['aPosition'], 2, this.gl.FLOAT, false, 0, 0);
    
    // The texture buffer is derived from the image resolution, except it requires coordinates
    // between [0, 1].
    x1 = y1 = 0.0;
    
    // TODO: Need to check how this functions when handling the case of tiling along only one dimension.
    x2 = (xTiles === 1) ? 1.0 : width / (xTiles * this.maximumTextureSize);
    y2 = (yTiles === 1) ? 1.0 : height / (yTiles * this.maximumTextureSize);
    
    var textureBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, textureBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]),
      this.gl.STATIC_DRAW
    );
    this.gl.enableVertexAttribArray(this.attributes[this.transfer]['aTextureCoordinate']);
    this.gl.vertexAttribPointer(this.attributes[this.transfer]['aTextureCoordinate'], 2, this.gl.FLOAT, false, 0, 0);
    this.buffers['texture'] = textureBuffer;
  };
  
  // Generates a fragment shader based on the number of tiles needed to display an image.
  RawImage.prototype.createTiledFragmentShader = function(transfer, xTiles, yTiles) {
    var conditionals = { 0: "if" };
    
    var fn = RawImage.shaders.getPixelFromTile.slice(0);
    
    for (var x = 0; x < xTiles; x++) {
      var xConditional = conditionals[x] || "else if";
      fn.push(xConditional + " (textureCoordinate.x < (" + (x + 1) + ".0 * dx)) {");
      
      for (var y = 0; y < yTiles; y++) {
        var yConditional = conditionals[y] || "else if";
        fn.push("\t" + yConditional + " (textureCoordinate.y < (" + (y + 1) + ".0 * dy)) {");
      
        fn.push("\t\tscaledPosition = (textureCoordinate - vec2(" + x + ".0 * dx, " + y + ".0 * dy)) / delta;");
        fn.push("\t\tpixel = texture2D(uTexture" + x + "" + y + ", scaledPosition);");
        fn.push("\t}");  
      }
      fn.push("}")
    }
    fn.push("return pixel;");
    fn.push("}");
    
    var fragmentShader = RawImage.shaders[transfer].slice(0);
    fragmentShader.splice.apply(fragmentShader, [this.textureLookupFnAddress, 0].concat(fn));
    
    // Generate a fragment shader with xTiles * yTiles textures
    var textureSrc = [this.textureAddress, 1];
    for (var j = 0; j < yTiles; j++) {
      for (var i = 0; i < xTiles; i++) {
        var index = j * xTiles + i;
        
        textureSrc.push("uniform sampler2D uTexture" + i + "" + j + ";");
        this.textureKeys.push("uTexture" + i + "" + j);
      }
    }
    fragmentShader.splice.apply(fragmentShader, textureSrc);
    
    return fragmentShader.join('\n');
  }
  
  RawImage.prototype.draw = function() {
    this.updateUniforms();
    this.gl.clearColor(1.0, 0.0, 0.0, 1.0);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  };
  
  // TODO: Only supporting a single texture right now!
  RawImage.prototype.loadImage = function(id, arr, width, height, callback) {
    var index, texture;
    
    this.imageWidth = width;
    this.imageHeight = height;
    
    // TODO: Check if GL has been setup. If it has, then skip GL setup, and check that the next image can use
    // the previously generated fragment shader (e.g. the width, height, xTiles and yTiles are identical).
    
    //
    // Loading an image is a multi-step process
    //
    
    // Generate a fragment shader based on the image resolution
    this.initGL(width, height);
    
    // GL is all initialized, so proceed to loading image
    var xTiles = this.xTiles;
    var yTiles = this.yTiles;
    
    // Tile the image
    for (var j = 0; j < yTiles; j++) {
      for (var i = 0; i < xTiles; i++) {
        
        // Determine the resolution of current tile based on tile indices and resolution
        // of source image.
        
        // Get the origin for the current tile
        var x1 = i * this.maximumTextureSize;
        var y1 = j * this.maximumTextureSize;
        
        // Get the remaining number of pixels needing to be tiled
        var xr = width - x1;
        var yr = height - y1;
        
        // If larger than the max texture size, then set the tile extent to the max texture size
        var x2 = (xr > this.maximumTextureSize) ? this.maximumTextureSize : xr;
        var y2 = (yr > this.maximumTextureSize) ? this.maximumTextureSize : yr;
        
        // Get tile from full image
        // TODO: This loop is not required if the image is not being tiled (e.g. when xTiles = yTiles = 1)
        var tile = new Float32Array(x2 * y2);
        var counter = 0;
        for (var jj = y1; jj < y1 + y2; jj++) {
          for (var ii = x1; ii < x1 + x2; ii++) {
            tile[counter] = arr[jj * width + ii];
            counter++;
          }
        }
    
        // Create texture from tile
        var index = j * xTiles + i + 1; // Offset by 1 to account for the colormap texture
        this.gl.activeTexture(this.gl["TEXTURE" + index]);
        texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, x2, y2, 0, this.gl.LUMINANCE, this.gl.FLOAT, tile);
        
        // Update the texture uniform for each program
        var key = this.textureKeys[index];
        for (name in this.programs) {
          if (name === 'color') continue;
          
          var program = this.programs[name];
          this.gl.useProgram(program);
          
          this.uniforms[name][key] = this.gl.getUniformLocation(program, key);
          this.gl.uniform1i(this.uniforms[name][key], index);
        }
        
      }
    }
    this.gl.useProgram(this.program);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }
  
  RawImage.prototype.setColorMap = function(cmap) {
    var name, program, uColorIndex, cmaps, index;
  
    cmaps = Object.keys(RawImage.colormaps);
    index = cmaps.indexOf('base64');
    cmaps.splice(index, 1);
    
    // Default to grayscale colormap if user-specified colormap does not exist
    cmap = cmaps.indexOf(cmap) > -1 ? cmap : 'binary';
    
    for (name in this.programs) {
      if (name === 'color') continue;
      
      program = this.programs[name];
      this.gl.useProgram(program);
      
      uColorIndex = this.uniforms[name].uColorIndex;
      
      // The color index must be offset by 0.5 since graphics cards
      // approximate the pixel coordinate differently. 
      this.gl.uniform1f(uColorIndex, RawImage.colormaps[cmap] - 0.5);
    };
    
    // Switch back to current program
    this.gl.useProgram(this.program);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  };
  
  RawImage.prototype.setImage = function(id) {
    var index = this.lookup[id];
    this.gl.activeTexture(this.gl.TEXTURE0 + index);
    this.gl.uniform1i(this.uniforms[this.program].uTexture0, index);
    this.currentImage = id;
  };
  
  RawImage.prototype.setExtent = function(min, max) {
    var name, program, uExtent;
    
    for (name in this.programs) {
      if (name === 'color') continue;
      
      program = this.programs[name];
      this.gl.useProgram(program);
      
      uExtent = this.uniforms[name].uExtent;
      this.gl.uniform2f(uExtent, min, max);
    }
    
    // Switch back to current program
    this.gl.useProgram(this.program);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  };
  RawImage.prototype.setTransfer = function(transfer) {
    this.transfer = transfer;
    this.program = this.programs[transfer];
    this.gl.useProgram(this.program);
    
    this.draw();
  };
  
  // RawImage.prototype.setScales = function(r, g, b) {
  //   var color;
  //   
  //   this.gl.useProgram(this.programs.color);
  //   
  //   color = this.uniforms.color;
  //   this.gl.uniform1f(color.uScaleR, r);
  //   this.gl.uniform1f(color.uScaleG, g);
  //   this.gl.uniform1f(color.uScaleB, b);
  //   
  //   this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  // };
  // 
  // RawImage.prototype.setCalibrations = function(r, g, b) {
  //   var color;
  //   
  //   this.gl.useProgram(this.programs.color);
  //   
  //   color = this.uniforms.color;
  //   this.gl.uniform1f(color.uCalibrationR, r);
  //   this.gl.uniform1f(color.uCalibrationG, g);
  //   this.gl.uniform1f(color.uCalibrationB, b);
  //   
  //   this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  // };
  // 
  // RawImage.prototype.setAlpha = function(alpha) {
  //   this.gl.useProgram(this.programs.color);
  //   this.gl.uniform1f(this.uniforms.color.uAlpha, alpha);
  //   this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  // };
  // 
  // RawImage.prototype.setQ = function(Q) {
  //   this.gl.useProgram(this.programs.color);
  //   this.gl.uniform1f(this.uniforms.color.uQ, Q);
  //   this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  // };
  // 
  // RawImage.prototype.drawColor = function(rId, gId, bId) {
  //   this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  //   this.program = 'color';
  //   this.gl.useProgram(this.programs.color);
  //   
  //   this.gl.uniform1i(this.uniforms.color.uTexture0, this.lookup[rId]);
  //   this.gl.uniform1i(this.uniforms.color.uTexture1, this.lookup[gId]);
  //   this.gl.uniform1i(this.uniforms.color.uTexture2, this.lookup[bId]);
  //   
  //   this.draw();
  // };
  RawImage.version = "0.5.1-tile";
  return RawImage;
})();