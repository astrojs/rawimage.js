
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
  this.uniformKeys = [
    'uOffset', 'uScale', 'uExtent', 'uColorIndex', 'uColorMap', 'uXTiles', 'uYTiles'
  ];
  
  // Position the canvases
  parentStyle = this.canvas.parentElement.style;
  parentStyle.width = "" + this.canvas.width + "px";
  parentStyle.height = "" + this.canvas.height + "px";
  parentStyle.overflow = 'hidden';
  // parentStyle.backgroundColor = '#FF0000';
  // parentStyle.backgroundColor = '#252525';
  parentStyle.position = 'relative';
  
  canvasStyle = this.canvas.style;
  canvasStyle.position = 'absolute';
  canvasStyle.top = 0;
  canvasStyle.left = 0;
  
  overlayStyle = this.overlay.style;
  overlayStyle.position = 'absolute';
  overlayStyle.top = 0;
  overlayStyle.left = 0;
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

// Define or reset storage for various GL elements. By default each RawImage context has the color map texture
// at the GL 0th texture address.
RawImage.prototype.reset = function() {
  this.programs = {};
  this.uniforms = {};
  this.attributes = {};
  this.textures = {};
  this.buffers = {};
  this.shaders = [];
  
  // Texture lookup table for referencing user specified identifiers with a GL texture index
  this.textureLookup = {};
  this.textureKeys = ['uColorMap'];
  this.nTextures = 1;
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
