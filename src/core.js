
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
  
  // Keep track of textures uploaded to GPU
  this.nTextures = 1;
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

rawimage.prototype.reset = function() {
  this.programs = {};
  this.uniforms = {};
  this.textures = {};
  this.buffers = [];
  this.shaders = [];
};

rawimage.prototype.setStretch = function(stretch) {
  this.program = stretch;
  this.gl.useProgram(this.programs[stretch]);
  this.draw();
};

// Release all objects on the GPU
// TODO: Make functions to release specific texture/program/buffer
rawimage.prototype.destroy = function() {
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
