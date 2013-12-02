
function rawimage(el, dimension) {
  var canvasStyle, overlayStyle, parentStyle;
  
  this.el = el;
  this.width = this.height = dimension;
  this.reset();
  
  // Createa a canvas for the WebGL context
  this.canvas = document.createElement('canvas');
  this.canvas.setAttribute('width', this.width);
  this.canvas.setAttribute('height', this.height);
  this.canvas.setAttribute('class', 'rawimage-visualization');
  
  // Create a canvas for other annotations (e.g. crosshair)
  this.overlay = document.createElement('canvas');
  this.overlay.setAttribute('width', this.width);
  this.overlay.setAttribute('height', this.height);
  this.overlay.setAttribute('class', 'rawimage-overlay');
  this.overlayCtx = this.overlay.getContext('2d');
  
  this.el.appendChild(this.canvas);
  this.el.appendChild(this.overlay);
  
  // Index textures uploaded to GPU
  this.nImages = 1;
  this.lookup = {};
  
  // TODO: Rename this function since porting to only WebGL implementation
  if (!this.getContext()) return null;
  
  this.offsetLeft = this.canvas.offsetLeft;
  this.offsetTop = this.canvas.offsetTop;
  
  parentStyle = this.canvas.parentElement.style;
  parentStyle.width = "" + this.canvas.width + "px";
  parentStyle.height = "" + this.canvas.height + "px";
  parentStyle.overflow = 'hidden';
  parentStyle.backgroundColor = '#252525';
  parentStyle.position = 'relative';
  
  canvasStyle = this.canvas.style;
  canvasStyle.position = 'absolute';
  
  overlayStyle = this.overlay.style;
  overlayStyle.position = 'absolute';
  overlayStyle.pointerEvents = 'none';
  
  this.xOffset = -this.width / 2;
  this.yOffset = -this.height / 2;
  this.xOldOffset = this.xOffset;
  this.yOldOffset = this.yOffset;
  this.drag = false;
  
  // TODO: Dynamically set min and max zoom based on the image dimension
  this.zoom = 2 / this.width;
  this.minZoom = this.zoom / 8;
  this.maxZoom = 20 * this.zoom;
  this.zoomX = this.zoom;
  this.zoomY = this.zoom;
  
  this.crosshair = false;
};

rawimage.prototype.drawCrosshair = function() {
  
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


// Setup panning and zooming with optional user-specified callbacks.
// Callbacks may be used to capture coordinates or execute custom functionality
// on mouse events. To specify opts without callbacks, pass either
// undefined or an empty object {}.
rawimage.prototype.setupControls = function(callbacks, opts) {
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
    if (!target.drag) return;
    
    dx = e.clientX - target.xMouseDown;
    dy = e.clientY - target.yMouseDown;
    
    target.xOffset = target.xOldOffset + (dx / target.width / target.zoom * 2.0);
    target.yOffset = target.yOldOffset - (dy / target.height / target.zoom * 2.0);
    
    target.draw();
    
    // Compute the coordinates in the image reference frame
    xOffset = e.clientX - target.offsetLeft;
    yOffset = e.clientY - target.offsetTop;
    
    dx = -1 * (target.width / 2 - xOffset) / target.width / target.zoom * 2.0;
    dy = (target.height / 2 - yOffset) / target.height / target.zoom * 2.0;
    
    // TODO: Might be wiser to save (x, y) on rawimage object. This would
    //       allow uniform behavior across all user-specified callbacks.
    x = ((-1 * (target.xOffset + 0.5)) + dx) + 1.5 << 0;
    y = ((-1 * (target.yOffset + 0.5)) + dy) + 1.5 << 0;
    
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
rawimage.prototype.setCursor = function() {
  this.overlay.width = this.overlay.width;
  this.crosshair = (type === 'crosshair' ? true : false);
};

rawimage.prototype.reset = function() {
  this.programs = {};
  this.uniforms = {};
  this.textures = {};
  this.buffers = [];
  this.shaders = [];
};

rawimage.prototype.fragmentShaders = ['linear', 'logarithm', 'sqrt', 'arcsinh', 'power', 'color'];

// Get necessary WebGL extensions (e.g. floating point textures).
rawimage.prototype.getExtension = function() {
  return this.gl.getExtension('OES_texture_float');
};

rawimage.prototype.loadShader = function(source, type) {
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

rawimage.prototype.createProgram = function(vshader, fshader) {
  var gl, linked, program;
  
  gl = this.gl;
  
  program = gl.createProgram();
  gl.attachShader(program, vshader);
  gl.attachShader(program, fshader);
  gl.linkProgram(program);
  
  linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) {
    gl.deleteProgram(program);
    throw "Error in program linking: " + (gl.getProgramInfoLog(program));
    return null;
  }
  
  return program;
};

// TODO: Find out how to support non-square viewports
rawimage.prototype.setRectangle = function(width, height) {
  var x1, x2, y1, y2;
  
  x1 = 0, x2 = width;
  y1 = 0, y2 = height;
  
  this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), this.gl.STATIC_DRAW);
};

rawimage.prototype.updateUniforms = function() {
  var uniforms = this.uniforms[this.program];
  this.gl.uniform2f(uniforms.uOffset, this.xOffset, this.yOffset);
  this.gl.uniform1f(uniforms.uScale, this.zoom);
};

rawimage.prototype.getContext = function() {
  var width, height, ext, vertexShader, fragmentShader, key, i, program, buffer;
  
  this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
  if (!this.gl) return false;
  
  width = this.width;
  height = this.height;
  this.gl.viewport(0, 0, width, height);
  
  ext = this.getExtension();
  if (!ext) return false;
  
  vertexShader = this.loadShader(rawimage.shaders.vertex, this.gl.VERTEX_SHADER);
  if (!vertexShader) return false;
  
  // Create all fragment shaders
  // TODO: Could be more GPU memory efficient by loading only shaders when called
  //       and removing those when not used.
  for (i = 0; i < this.fragmentShaders.length; i += 1) {
    key = this.fragmentShaders[i];
    fragmentShader = this.loadShader(rawimage.shaders[key], this.gl.FRAGMENT_SHADER);
    if (!fragmentShader) return false;
    
    program = this.createProgram(vertexShader, fragmentShader);
    this.programs[key] = program;
    if (!program) return false;
    
    // Cache and set uniform locations
    this.gl.useProgram(program);
    this.uniforms[key] = {
      uOffset: this.gl.getUniformLocation(program, 'uOffset'),
      uScale: this.gl.getUniformLocation(program, 'uScale'),
      uExtent: this.gl.getUniformLocation(program, 'uExtent'),
      uColorIndex: this.gl.getUniformLocation(program, 'uColorIndex'),
      uColorMap: this.gl.getUniformLocation(program, 'uColorMap')
    };
    
    // TODO: Offset the image so that it's centered on load
    this.gl.uniform2f(this.uniforms[key].uOffset, -width / 2, -height / 2);
    this.gl.uniform1f(this.uniforms[key].uScale, 2 / width);
    this.gl.uniform1f(this.uniforms[key].uColorIndex, rawimage.colormaps.binary);
  }
  
  // Cache attribute locations
  this.aPosition = this.gl.getAttribLocation(program, 'aPosition');
  this.aTextureCoordinate = this.gl.getAttribLocation(program, 'aTextureCoordinate');
  
  // Start with the linearly scaled image
  this.program = 'linear';
  this.gl.useProgram(this.programs[this.program]);
  
  // Create texture and position buffers
  var textureBuffer = this.gl.createBuffer();
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, textureBuffer);
  this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), this.gl.STATIC_DRAW);
  this.gl.enableVertexAttribArray(this.aTextureCoordinate);
  this.gl.vertexAttribPointer(this.aTextureCoordinate, 2, this.gl.FLOAT, false, 0, 0);
  this.buffers.push(textureBuffer);
  
  var positionBuffer = this.gl.createBuffer();
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
  this.gl.enableVertexAttribArray(this.aPosition);
  this.gl.vertexAttribPointer(this.aPosition, 2, this.gl.FLOAT, false, 0, 0);
  this.buffers.push(positionBuffer);
  
  this.loadColorMap();
  this.currentImage = null;
  
  return true;
};

rawimage.prototype.loadColorMap = function() {
  var img,
      target = this;
  
  this.setRectangle(256, 70);
  img = new Image();
  img.onload = function() {
    var texture, name, program, uColorMap;
    
    target.gl.activeTexture(target.gl.TEXTURE0);
    texture = target.gl.createTexture();
    target.gl.bindTexture(target.gl.TEXTURE_2D, texture);
    target.gl.texParameteri(target.gl.TEXTURE_2D, target.gl.TEXTURE_WRAP_S, target.gl.CLAMP_TO_EDGE);
    target.gl.texParameteri(target.gl.TEXTURE_2D, target.gl.TEXTURE_WRAP_T, target.gl.CLAMP_TO_EDGE);
    target.gl.texParameteri(target.gl.TEXTURE_2D, target.gl.TEXTURE_MIN_FILTER, target.gl.NEAREST);
    target.gl.texParameteri(target.gl.TEXTURE_2D, target.gl.TEXTURE_MAG_FILTER, target.gl.NEAREST);
    
    target.gl.texImage2D(target.gl.TEXTURE_2D, 0, target.gl.RGB, target.gl.RGB, target.gl.UNSIGNED_BYTE, img);
    
    for (name in target.programs) {
      if (name === 'color') continue;
      
      program = target.programs[name];
      target.gl.useProgram(program);
      
      uColorMap = target.uniforms[name].uColorMap;
      target.gl.uniform1i(uColorMap, 0);
    };
    
    // Switch back to current program
    target.gl.useProgram(target.programs[target.program]);
    target.gl.drawArrays(target.gl.TRIANGLES, 0, 6);
  };
  img.src = "data:image/png;base64," + rawimage.colormaps.base64;
};

rawimage.prototype.loadImage = function(id, arr, width, height) {
  var index, texture;
  
  if (id in this.lookup) {
    index = this.lookup[id];
    this.gl.activeTexture(this.gl.TEXTURE0 + index);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, width, height, 0, this.gl.LUMINANCE, this.gl.FLOAT, new Float32Array(arr));
    return;
  }
  
  this.setRectangle(width, height);
  
  index = this.nImages;
  this.lookup[id] = this.nImages;
  
  this.gl.activeTexture(this.gl.TEXTURE0 + this.nImages);
  texture = this.gl.createTexture();
  this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
  
  // TODO: Remove need to cast to Float32 array. Check if WebGL supports other data types now.
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, width, height, 0, this.gl.LUMINANCE, this.gl.FLOAT, new Float32Array(arr));
  this.currentImage = this.currentImage || id;
  
  this.textures[id] = texture;
  this.nImages += 1;
}

rawimage.prototype.setColorMap = function(cmap) {
  var cmaps, index, name, program, uColorIndex;
  
  cmaps = Object.keys(rawimage.colormaps);
  index = cmaps.indexOf('base64');
  cmaps.splice(index, 1);
  
  // Default to grayscale colormap if user-specified colormap does not exist
  cmap = cmaps.indexOf(cmap) > -1 ? cmap : 'binary';
  
  for (name in this.programs) {
    if (name === 'color') continue;
    
    program = this.programs[name];
    this.gl.useProgram(program);
    
    uColorIndex = this.uniforms[name].uColorIndex;
    this.gl.uniform1f(uColorIndex, rawimage.colormaps[cmap]);
  };
  
  // Switch back to current program
  this.gl.useProgram(this.programs[this.program]);
  this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
};

rawimage.prototype.setImage = function(id) {
  var index, program, uTexture;
  
  index = this.lookup[id];
  this.gl.activeTexture(this.gl.TEXTURE0 + index);
  
  program = this.programs[this.program];
  uTexture = this.gl.getUniformLocation(program, 'uTexture');
  this.gl.uniform1i(uTexture, index);
  this.currentImage = id;
};

rawimage.prototype.setStretch = function(stretch) {
  this.program = stretch;
  this.gl.useProgram(this.programs[stretch]);
  this.setImage(this.currentImage);
  this.draw();
};

rawimage.prototype.setExtent = function(min, max) {
  var name, program, uExtent;
  
  for (name in this.programs) {
    if (name === 'color') continue;
    
    program = this.programs[name];
    this.gl.useProgram(program);
    
    uExtent = this.uniforms[name].uExtent;
    this.gl.uniform2f(uExtent, min, max);
  }
  
  // Switch back to current program
  this.gl.useProgram(this.programs[this.program]);
  this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
};

rawimage.prototype.setScales = function(r, g, b) {};
rawimage.prototype.setCalibrations = function(r, g, b) {};
rawimage.prototype.setAlpha = function(alpha) {};
rawimage.prototype.setQ = function(Q) {};

rawimage.prototype.draw = function() {
  this.updateUniforms(this.program);
  this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
};

