rawimage.prototype.loadImage = function(id, arr, width, height) {
  var index, texture, factor, downsampled;
  
  // Downsample if the image is too large for the GPU
  var dimension = (width > height) ? width : height;
  if (dimension > this.MAX_TEXTURE_SIZE) {
    factor = ~~(dimension / this.MAX_TEXTURE_SIZE) + 1;
    downsampled = this.downsample(arr, width, height, factor);
    arr = downsampled.arr, width = downsampled.width, height = downsampled.height;
  }
  
  // Save on GPU memory by reusing the texture instead of creating a new one.
  if (this.lookup.hasOwnProperty(id)) {
    index = this.lookup[id];
    this.gl.activeTexture(this.gl.TEXTURE0 + index);
    if (arr.constructor !== Float32Array) {
      arr = new Float32Array(arr);
    }
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, width, height, 0, this.gl.LUMINANCE, this.gl.FLOAT, arr);
    return;
  }
  
  this.setRectangle(width, height);
  
  index = this.nTextures;
  this.lookup[id] = this.nTextures;
  
  this.gl.activeTexture(this.gl.TEXTURE0 + index);
  texture = this.gl.createTexture();
  this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
  
  // TODO: Remove need to cast to Float32 array. Check if WebGL supports other data types now.
  //       This might be due to the use of the floating point extension. Need to look at this in depth.
  if (arr.constructor !== Float32Array) {
    arr = new Float32Array(arr);
  }
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, width, height, 0, this.gl.LUMINANCE, this.gl.FLOAT, arr);
  
  // Current image defaults to the first texture uploaded.
  this.currentImage = this.currentImage || id;
  
  this.textures[id] = texture;
  this.nTextures += 1;
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
    
    // The color index must be offset by 0.5 since graphics cards
    // approximate the pixel coordinate differently. 
    this.gl.uniform1f(uColorIndex, rawimage.colormaps[cmap] - 0.5);
  };
  
  // Switch back to current program
  this.gl.useProgram(this.programs[this.program]);
  this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
};

rawimage.prototype.setImage = function(id) {
  var index = this.lookup[id];
  this.gl.activeTexture(this.gl.TEXTURE0 + index);
  this.gl.uniform1i(this.uniforms[this.program].uTexture0, index);
  this.currentImage = id;
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