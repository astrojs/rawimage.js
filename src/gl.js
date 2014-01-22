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
  var uniforms = this.uniforms[this.program];
  
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
RawImage.prototype.initGL = function(xTiles, yTiles) {
  
  var fragmentShader = this.createTiledFragmentShader(xTiles, yTiles);
  console.log(fragmentShader.join('\n'));
  
  vertexShader = this.loadShader(RawImage.shaders.vertex, this.gl.VERTEX_SHADER);
  if (!vertexShader) return false;
  
  // Create all fragment shaders
  // TODO: Could be more GPU memory efficient by loading only shaders when called
  //       and removing those when not used.
  this.fragmentShaders.forEach(function(key) {
    fragmentShader = this.loadShader(rawimage.shaders[key], this.gl.FRAGMENT_SHADER);
    if (!fragmentShader) return false;
    
    program = this.createProgram(vertexShader, fragmentShader);
    if (!program) return false;
    this.programs[key] = program;
    
    // Cache uniforms since they are expensive to look up
    this.gl.useProgram(program);
    this.uniforms[key] = {};
    ['uOffset', 'uScale', 'uExtent', 'uColorIndex', 'uColorMap', 'uTexture0'].forEach(function(u){
      this.uniforms[key][u] = this.gl.getUniformLocation(program, u);
    }, this);
    
    // TODO: Offset the image so that it's centered on load
    this.gl.uniform2f(this.uniforms[key].uOffset, -width / 2, -height / 2);
    this.gl.uniform1f(this.uniforms[key].uScale, 2 / width);
    this.gl.uniform1f(this.uniforms[key].uColorIndex, rawimage.colormaps.binary - 0.5);
    this.gl.uniform1i(this.uniforms[key].uTexture0, 1);
  }, this);
  
  // Cache color program uniforms (no need to switch programs since color is current)
  ['uScaleR', 'uScaleG', 'uScaleB',
   'uCalibrationR', 'uCalibrationG', 'uCalibrationB',
   'uAlpha', 'uQ',
   'uTexture1', 'uTexture2'].forEach(function(key) {
    this.uniforms['color'][key] = this.gl.getUniformLocation(program, key);
  }, this);
  
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
  this.currentImage = null;
  
  // Store the maximum texture size
  // Does this account for floating point textures?
  this.MAX_TEXTURE_SIZE = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
  
  return true;
};

RawImage.prototype.createTiledFragmentShader = function(xTiles, yTiles) {
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
  
  var fragmentShader = RawImage.shaders.fragment.slice(0);
  fragmentShader.splice.apply(fragmentShader, [this.textureLookupFnAddress, 0].concat(fn));
  
  // Generate a fragment shader with xTiles * yTiles textures
  var textureSrc = [this.textureAddress, 1];
  var textureKeys = [];
  for (var j = 0; j < yTiles; j++) {
    for (var i = 0; i < xTiles; i++) {
      var index = j * xTiles + i;
      
      textureSrc.push("uniform sampler2D uTexture" + i + "" + j + ";");
      textureKeys.push("uTexture" + i + "" + j);
    }
  }
  fragmentShader.splice.apply(fragmentShader, textureSrc);
  
  return fragmentShader;
}

RawImage.prototype.draw = function() {
  this.updateUniforms();
  this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
};