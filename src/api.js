
RawImage.prototype.loadImage = function(id, arr, width, height, callback) {
  var index, texture;
  
  // Save on GPU memory by reusing the texture instead of creating a new one.
  // First check if an id has been used before. If so, reuse the previously allocated texture.
  // TODO: Incorporate texture reuse for tiled image implementation.
  if (this.textureLookup.hasOwnProperty(id)) {
    index = this.textureLookup[id];
    this.gl.activeTexture(this.gl.TEXTURE0 + index);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, width, height, 0, this.gl.LUMINANCE, this.gl.FLOAT, new Float32Array(arr));
    return;
  }
  
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