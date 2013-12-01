
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
    var factor;
    
    e.preventDefault();
    factor = e.shiftKey ? 1.01 : 1.1;
    
    target.zoom *= (e.wheelDelta || e.deltaY) < 0 ? 1 / factor : factor;
    target.zoom = target.zoom > target.maxZoom ? target.maxZoom : target.zoom;
    target.zoom = target.zoom < target.minZoom ? target.minZoom : target.zoom;
    
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
rawimage.prototype.grayscale = 32;

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
rawimage.prototype.setRectangle = function(gl, width, height) {
  var x1, x2, y1, y2;
  
  x1 = 0, x2 = width;
  y1 = 0, y2 = height;
  
  return gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), gl.STATIC_DRAW);
};

rawimage.prototype.updateUniforms = function(program) {
  var offsetLocation, scaleLocation;
  
  // TODO: Store uniforms on rawimage object. This is an expensive lookup.
  offsetLocation = this.gl.getUniformLocation(program, 'u_offset');
  scaleLocation = this.gl.getUniformLocation(program, 'u_scale');
  
  this.gl.uniform2f(offsetLocation, this.xOffset, this.yOffset);
  this.gl.uniform1f(scaleLocation, this.zoom);
};

//
//  Public API
//
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
      uColorIndex: this.gl.getUniformLocation(program, 'uColorIndex')
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
  buffer = this.gl.createBuffer();
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
  this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), this.gl.STATIC_DRAW);
  this.gl.enableVertexAttribArray(this.aTextureCoordinate);
  this.gl.vertexAttribPointer(this.aTextureCoordinate, 2, this.gl.FLOAT, false, 0, 0);
  this.buffers.push(buffer);
  
  buffer = this.gl.createBuffer();
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
  this.gl.enableVertexAttribArray(this.aPosition);
  this.gl.vertexAttribPointer(this.aPosition, 2, this.gl.FLOAT, false, 0, 0);
  this.buffers.push(buffer);
  
  this.loadColorMap();
  return true;
};


rawimage.prototype.loadColorMap = function() {
  var img, target;
  
  this.setRectangle(this.gl, 256, 70);
  img = new Image();
  img.onload = function() {
    var texture, name, program, uniform;
    
    this.gl.activeTexture(this.gl.TEXTURE0);
    texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.gl.RGB, this.gl.UNSIGNED_BYTE, img);
    
    // TODO: Loop over programs object instead
    for (i = 0; i < this.fragmentShaders; i += 1) {
      
      // TODO: Find out if we must switch programs to update a uniform on another program.
      name = this.fragmentShaders[i];
      program = this.programs[name];
      this.gl.useProgram(program);
      
      uniform = this.uniforms[name];
      this.gl.uniform1i(uniform, 0);
    }
    
    // Switch back to current program
    this.gl.useProgram(this.program);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  };
  img.src = "data:image/png;base64," + rawimage.colormaps.base64;
};