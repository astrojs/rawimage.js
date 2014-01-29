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
    
    // The image width is initially fit into the canvas width
    var imageX = canvasX * (target.imageWidth / this.width);
    var imageY = canvasY * (target.imageWidth / this.width);
    
    // Get the translation offset
    // Translation offsets are in clipspace units [0, 2]
    // These need to be converted to pixel units (e.g. [0, 2] -> [0, width])
    var translateX = (this.width / 2) * target.xOffset;
    var translateY = (this.height / 2) * target.yOffset;
    
    // Get offset associated with zoom
    var zoomOffsetX = 0.5 * (target.imageWidth - target.imageWidth / target.zoom);
    var zoomOffsetY = 0.5 * (this.height * (target.imageWidth / this.width) - (this.height / target.zoom) * (target.imageWidth / this.width));
    zoomOffsetY = target.imageHeight - this.height * (target.imageWidth / this.width) / target.zoom - zoomOffsetY
    
    var x = imageX / target.zoom - translateX + zoomOffsetX;
    var y = imageY / target.zoom + translateY + zoomOffsetY;
    
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