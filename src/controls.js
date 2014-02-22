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
    
    var imageCoordinates = target.getImageCoordinate(canvasX, canvasY);
    var x = imageCoordinates[0];
    var y = imageCoordinates[1];
    
    callbacks.onmousemove.call(target, e, x, y, opts);
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

// Map the canvas pixel coordinates to image pixel coordinates. This requires multiple transformations.
// 
// 1. Transform canvas coordinates to clipspace coordinates
// 2. Transform clipspace coordinates to texture coordinates
// 3. Transform texture coordinates to image coordinates

RawImage.prototype.getImageCoordinate = function(xCanvas, yCanvas) {
  
  // Transform canvas pixel coordinates to clipspace coordinates. The position
  // buffer defines the extent of the clipspace coordinates. By convention, the
  // image width is mapped to the usual clipspace extent (-1, 1). Initially this
  // means the canvas width corresponds to (-1, 1) for clipspace-x. Clipspace-y
  // is computed based on the canvas proportion.
  
  var wc = this.canvas.width;
  var hc = this.canvas.height;
  
  var xp = ((2 / wc) * xCanvas - 1) / this.zoom - this.xOffset;
  var yp = ((2 / hc) * yCanvas - 1) / this.zoom + this.yOffset;
  
  // Transform clipspace coordinates to texture coordinates. Before doing this, the
  // domain of clipspace-y must be known.
  var y2 = 2.0 * (wc / hc) - 1;
  
  var xt = 0.5 * (xp + 1);
  var yt = (1 / (1 + y2)) * (yp - 1) + 1;
  
  // Texture coordinates to image pixel coordinates
  var x = xt * this.imageWidth;
  var y = yt * this.imageHeight;
  
  return [x, y];
}

// Get the canvas pixel coordinates from the image pixel coordinates
RawImage.prototype.getCanvasCoordinate = function(x, y) {
  var translateX = (this.width / 2) * this.xOffset;
  var zoomOffsetX = 0.5 * (this.imageWidth - this.imageWidth / this.zoom);
  var canvasX = this.zoom * (x + translateX - zoomOffsetX) * (this.width / this.imageWidth);
  
  var translateY = (this.height / 2) * this.yOffset;
  var zoomOffsetY = 0.5 * (this.height * (this.imageWidth / this.width) - (this.height / this.zoom) * (this.imageWidth / this.width));
  zoomOffsetY = this.imageHeight - this.height * (this.imageWidth / this.width) / this.zoom - zoomOffsetY;
  var canvasY = this.zoom * (y - translateY - zoomOffsetY) * (this.width / this.imageWidth);
  
  return [canvasX, canvasY];
}

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