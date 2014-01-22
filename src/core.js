
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
  
  if (!this.getContext()) return null;
  
  // Position the canvases
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
  
  // Parameters for mouse events
  // TODO: Check these!!!
  this.xOffset = -width / 2;
  this.yOffset = -height / 2;
  this.xOldOffset = this.xOffset;
  this.yOldOffset = this.yOffset;
  this.drag = false;
  
  // TODO: Dynamically set min and max zoom based on the image dimension
  // TODO: Check these!!!
  this.zoom = 2 / width;
  this.minZoom = this.zoom / 8;
  this.maxZoom = 20 * this.zoom;
  this.zoomX = this.zoom;
  this.zoomY = this.zoom;
  
  this.crosshair = false;
};

// Define or reset storage for various GL elements
RawImage.prototype.reset = function() {
  this.programs = {};
  this.uniforms = {};
  this.textures = {};
  this.buffers = [];
  this.shaders = [];
  
  this.nTextures = 1;
  
  // Texture lookup table for referencing user specified identifiers with a GL texture index
  this.textureLookup = {};
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
