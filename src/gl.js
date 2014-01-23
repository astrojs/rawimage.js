RawImage.prototype.fragmentShaders = ['linear', 'logarithm', 'sqrt', 'arcsinh', 'power', 'color'];

// Get necessary WebGL extensions (e.g. floating point textures).
RawImage.prototype.getExtension = function() {
  return this.gl.getExtension('OES_texture_float');
};

RawImage.prototype.loadShader = function(source, type) {
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

RawImage.prototype.createProgram = function(vertexShader, fragmentShader) {
  var gl, linked, program;
  
  gl = this.gl;
  
  program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  
  linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) {
    gl.deleteProgram(program);
    throw "Error in program linking: " + (gl.getProgramInfoLog(program));
    return null;
  }
  
  return program;
};

RawImage.prototype.updateUniforms = function() {
  var uniforms = this.uniforms[this.transfer];
  
  this.gl.uniform2f(uniforms.uOffset, this.xOffset, this.yOffset);
  this.gl.uniform1f(uniforms.uScale, this.zoom);
};

RawImage.prototype.setupGLContext = function() {
  var width, height, ext, vertexShader, fragmentShader, key, i, program, buffer;
  
  this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
  if (!this.gl) return false;
  
  width = this.width;
  height = this.height;
  this.gl.viewport(0, 0, width, height);
  
  ext = this.getExtension();
  if (!ext) return false;
  
  this.maximumTextureSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
  return true;
}

// The remainder of GL setup code depends on knowing the number of tiles needed
// to display an image.
RawImage.prototype.initGL = function(width, height, callback) {
  
  // Determine the number of tiles from the image dimensions
  var xTiles = this.xTiles = Math.ceil(width / this.maximumTextureSize);
  var yTiles = this.yTiles = Math.ceil(height / this.maximumTextureSize);
  
  // Create and compile shaders
  vertexShader = this.loadShader(RawImage.shaders.vertex, this.gl.VERTEX_SHADER);
  if (!vertexShader) return false;
  
  // Every transfer function needs it's own program
  // TODO: Test performance of using conditional check of transfer function on one program
  // TODO: Retrofit the other fragment shaders for tiling.
  ["linear", "logarithm"].forEach(function(transfer) {
    
    var fragmentShaderStr = this.createTiledFragmentShader(transfer, xTiles, yTiles);
    var fragmentShader = this.loadShader(fragmentShaderStr, this.gl.FRAGMENT_SHADER);
    if (!fragmentShader) return false;
    
    var program = this.createProgram(vertexShader, fragmentShader);
    if (!program) return false;
    this.programs[transfer] = program;
    this.gl.useProgram(program);
    
    // Look up and store uniform locations
    this.uniforms[transfer] = {};
    this.uniformKeys.forEach(function(key) {
      this.uniforms[transfer][key] = this.gl.getUniformLocation(program, key);
    }, this);
    
    // Set initial uniforms for current program
    this.gl.uniform1f(this.uniforms[transfer].uXTiles, xTiles);
    this.gl.uniform1f(this.uniforms[transfer].uYTiles, yTiles);
    this.gl.uniform2f(this.uniforms[transfer].uOffset, 0.0, 0.0);
    this.gl.uniform1f(this.uniforms[transfer].uScale, 1.0);
    this.gl.uniform1f(this.uniforms[transfer].uColorIndex, RawImage.colormaps.binary - 0.5);
    
    // Get attribute locations
    this.attributes[transfer] = {};
    this.attributes[transfer]['aPosition'] = this.gl.getAttribLocation(program, 'aPosition');
    this.attributes[transfer]['aTextureCoordinate']  = this.gl.getAttribLocation(program, 'aTextureCoordinate');
  }, this);
  
  // Start with the linear transfer function
  this.transfer = 'linear';
  this.program = this.programs['linear'];
  this.gl.useProgram(this.program);
  
  // Create position and texture buffers
  var positionBuffer = this.gl.createBuffer();
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
  this.gl.enableVertexAttribArray(this.attributes[this.transfer]['aPosition']);
  this.gl.vertexAttribPointer(this.attributes[this.transfer]['aPosition'], 2, this.gl.FLOAT, false, 0, 0);
  this.buffers['position'] = positionBuffer;
  
  // Load the color map first using a clean buffer. Using a callback here to ensure instructions
  // sent to GPU synchronously.
  this.loadColorMap();
  
  // The position buffer is derived from the image resolution. Clipspace coordinates
  // must be computed. Start by working along a unit domain.
  var x1 = y1 = 0.0;
  var x2 = 1.0;
  y2 = this.canvas.width / this.canvas.height;

  // Transform to a [0, 2] domain
  x2 *= 2.0;
  y2 *= 2.0;

  // Transform to clipspace coordinates
  x1 -= 1.0;
  y1 -= 1.0;
  x2 -= 1.0;
  y2 -= 1.0;

  this.gl.bufferData(
    this.gl.ARRAY_BUFFER,
    new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]),
    this.gl.STATIC_DRAW
  );
  this.gl.enableVertexAttribArray(this.attributes[this.transfer]['aPosition']);
  this.gl.vertexAttribPointer(this.attributes[this.transfer]['aPosition'], 2, this.gl.FLOAT, false, 0, 0);
  
  // The texture buffer is also derived from the image resolution, except it requires coordinates
  // between [0, 1].
  x1 = y1 = 0.0;
  x2 = y2 = 1.0;

  // Assuming the resolution is a multiple of the maximum support texture size,
  // compute the number of excess pixels using the image resolution.
  var xp = xTiles * this.maximumTextureSize % width;
  var yp = yTiles * this.maximumTextureSize % height;

  // Determine the fraction of excess pixels
  xp = xp / (xTiles * this.maximumTextureSize);
  yp = yp / (yTiles * this.maximumTextureSize);

  // Subtract from the maximum texture coordinate.
  x2 = x2 - xp;
  y2 = y2 - yp;

  var textureBuffer = this.gl.createBuffer();
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, textureBuffer);
  this.gl.bufferData(
    this.gl.ARRAY_BUFFER,
    new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]),
    this.gl.STATIC_DRAW
  );
  this.gl.enableVertexAttribArray(this.attributes[this.transfer]['aTextureCoordinate']);
  this.gl.vertexAttribPointer(this.attributes[this.transfer]['aTextureCoordinate'], 2, this.gl.FLOAT, false, 0, 0);
  this.buffers['texture'] = textureBuffer;
};

// Generates a fragment shader based on the number of tiles needed to display an image.
RawImage.prototype.createTiledFragmentShader = function(transfer, xTiles, yTiles) {
  var conditionals = { 0: "if" };
  
  var fn = RawImage.shaders.getPixelFromTile.slice(0);
  
  for (var x = 0; x < xTiles; x++) {
    var xConditional = conditionals[x] || "else if";
    fn.push(xConditional + " (textureCoordinate.x < (" + (x + 1) + ".0 * dx)) {");
    
    for (var y = 0; y < yTiles; y++) {
      var yConditional = conditionals[y] || "else if";
      fn.push("\t" + yConditional + " (textureCoordinate.y < (" + (y + 1) + ".0 * dy)) {");
    
      fn.push("\t\tscaledPosition = (textureCoordinate - vec2(" + x + ".0 * dx, " + y + ".0 * dy)) / delta;");
      fn.push("\t\tpixel = texture2D(uTexture" + x + "" + y + ", scaledPosition);");
      fn.push("\t}");  
    }
    fn.push("}")
  }
  fn.push("return pixel;");
  fn.push("}");
  
  var fragmentShader = RawImage.shaders[transfer].slice(0);
  fragmentShader.splice.apply(fragmentShader, [this.textureLookupFnAddress, 0].concat(fn));
  
  // Generate a fragment shader with xTiles * yTiles textures
  var textureSrc = [this.textureAddress, 1];
  for (var j = 0; j < yTiles; j++) {
    for (var i = 0; i < xTiles; i++) {
      var index = j * xTiles + i;
      
      textureSrc.push("uniform sampler2D uTexture" + i + "" + j + ";");
      this.textureKeys.push("uTexture" + i + "" + j);
    }
  }
  fragmentShader.splice.apply(fragmentShader, textureSrc);
  
  return fragmentShader.join('\n');
}

RawImage.prototype.draw = function() {
  // this.updateUniforms();
  this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
};