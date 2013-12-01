
function rawimage(el, dimension) {
  var canvasStyle, overlayStyle, parentStyle;
  
  this.el = el;
  this.width = this.height = dimension;
  this._reset();
  
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
}

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
}


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
  }
  
  this.canvas.addEventListener('mousewheel', onzoom, false);
  this.canvas.addEventListener('wheel', onzoom, false);
}

// Toggle a cursor over the image.
// TODO: This check might be avoidable by redefining a cursor function
rawimage.prototype.setCursor = function() {
  this.overlay.width = this.overlay.width;
  this.crosshair = (type === 'crosshair' ? true : false);
}