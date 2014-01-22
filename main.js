(function() {
  
  // Define shader source and needed references
  var vertexShaderSrc = [
    "attribute vec2 aPosition;",
    "attribute vec2 aTextureCoordinate;",
    
    "uniform vec2 uOffset;",
    "uniform float uScale;",
    
    "varying vec2 vTextureCoordinate;",
    
    "void main() {",
      "vec2 position = aPosition + uOffset;",
      // "position = position * uScale;",
      "gl_Position = vec4(position, 0.0, 1.0);",
      
      "vTextureCoordinate = aTextureCoordinate;",
    "}"
  ];
  
  var textureAddress = 1;
  var textureLookupFnAddress = 6;
  var fragmentShaderSrc = [
    "precision mediump float;",
    
    "uniform sampler2D uTexture00;",
    "uniform vec2 uExtent;",
    "uniform float uXTiles;",
    "uniform float uYTiles;",
    
    "varying vec2 vTextureCoordinate;",
    
    "void main() {",
      "vec4 pixel_v = textureLookup(vTextureCoordinate);",
      
      "float min = uExtent[0];",
      "float max = uExtent[1];",
      "float pixel = (pixel_v.r - min) / (max - min);",
      
      "gl_FragColor = vec4(pixel, pixel, pixel, 1.0);",
    "}"
  ];
  
  // Define shader uniforms
  var uniformKeys = ['uOffset', 'uScale', 'uExtent', 'uXTiles', 'uYTiles'];
  
  // Create a texture look up function for the fragment shader.
  function getTextureLookupFn(xTiles, yTiles) {
    
    conditionals = {};
    conditionals[0] = "if";
    
    fn = [
      "vec4 textureLookup(vec2 textureCoordinate) {",
        "vec4 pixel;",
        
        "float dx = 1.0 / uXTiles;",
        "float dy = 1.0 / uYTiles;",
        
        "vec2 delta = vec2(dx, dy);",
        "vec2 scaledPosition;",
    ];
    
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
    fn.push("}")
    return fn;
  };
  
  // Define callback to be executed after FITS is received from the server
  function getImage(f, opts) {
    var dataunit = f.getDataUnit();
    opts = {
      dataunit: dataunit,
      el: opts.el
    };
    dataunit.getFrame(0, onData, opts);
  };
  
  function onData(arr, opts) {
    var dataunit = opts.dataunit;
    var width = dataunit.width;
    var height = dataunit.height;
    
    // Get the minimum and maximum pixels
    var extent = dataunit.getExtent(arr);
    
    var canvas = document.querySelector('#' + opts.el);
    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    gl.viewport(0, 0, canvas.width, canvas.height);
    var ext = gl.getExtension('OES_texture_float');
    
    //
    // With the image dimensions generate an appropriate fragment shader
    //
    var maximumTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    console.log('MAX TEXTURE SIZE', maximumTextureSize);
    
    tileCoordinates = [];
    xTiles = Math.ceil(width / maximumTextureSize);
    yTiles = Math.ceil(height / maximumTextureSize);
    
    console.log("xTile:\t", xTiles);
    console.log("yTile:\t", yTiles);
    
    // TEST: Generated texture lookup function
    fragmentShaderSrc.splice.apply(fragmentShaderSrc, [textureLookupFnAddress, 0].concat( getTextureLookupFn(xTiles, yTiles) ));
    
    // Generate a fragment shader with xTiles * yTiles textures
    var textureSrc = [textureAddress, 1];
    var textureKeys = [];
    for (var j = 0; j < yTiles; j++) {
      for (var i = 0; i < xTiles; i++) {
        var index = j * xTiles + i;
        
        textureSrc.push("uniform sampler2D uTexture" + i + "" + j + ";");
        textureKeys.push("uTexture" + i + "" + j);
      }
    }
    fragmentShaderSrc.splice.apply(fragmentShaderSrc, textureSrc);
    console.log(fragmentShaderSrc.join("\n"));
    
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSrc.join(''));
    gl.compileShader(vertexShader);
    
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSrc.join(''));
    gl.compileShader(fragmentShader);
    
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program); // Not necessary since linkProgram automatically uses it (or at least the first)
    
    // Get uniform locations
    var uniforms = {};
    uniformKeys.forEach(function(key) {
      uniforms[key] = gl.getUniformLocation(program, key);
    }, this);
    
    // Set initial uniforms
    gl.uniform1f(uniforms.uXTiles, xTiles);
    gl.uniform1f(uniforms.uYTiles, yTiles);
    gl.uniform2f(uniforms.uExtent, extent[0], extent[1]);
    
    // TODO: Create a function that accounts for inputting offset in clipspace coordinates
    gl.uniform2f(uniforms.uOffset, 0, 0);
    // gl.uniform2f(uniforms.uOffset, 0, -1);
    // gl.uniform2f(uniforms.uExtent, -0.20889312, 0.42971656);
    
    var aPosition = gl.getAttribLocation(program, 'aPosition');
    var aTextureCoordinate = gl.getAttribLocation(program, 'aTextureCoordinate');
    
    // Compute the position coordinates based on the image (data) resolution
    // Start by working between [0, 1]
    
    var x1 = y1 = 0.0;
    var x2 = y2 = 1.0;
    y2 = canvas.width / canvas.height;
    
    // Transform to a [0, 2] domain
    x2 = 2.0 * x2;
    y2 = 2.0 * y2;
    
    // Transform to clipspace coordinates [-1, 1]
    x1 = x1 - 1.0;
    y1 = y1 - 1.0;
    x2 = x2 - 1.0;
    y2 = y2 - 1.0;
    
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
    
    x1 = y1 = 0.0;
    x2 = y2 = 1.0;
    var xp = xTiles * maximumTextureSize % width;
    var yp = yTiles * maximumTextureSize % height;
    xp = xp / (xTiles * maximumTextureSize);
    yp = yp / (yTiles * maximumTextureSize);
    x2 = x2 - xp;
    y2 = y2 - yp;
    console.log(x2, y2);
    
    textureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]),
      // new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(aTextureCoordinate);
    gl.vertexAttribPointer(aTextureCoordinate, 2, gl.FLOAT, false, 0, 0);
    
    // Tile image
    for (var j = 0; j < yTiles; j++) {
      for (var i = 0; i < xTiles; i++) {
        
        // Determine the resolution of current tile based on tile indices and resolution
        // of source image.
        
        // Get the origin for the current tile
        var x1 = i * maximumTextureSize;
        var y1 = j * maximumTextureSize;
        
        // Get the remaining number of pixels needing to be tiled
        var xr = width - x1;
        var yr = height - y1;
        
        // If larger than the max texture size, then set the tile extent to the max texture size
        var x2 = (xr > maximumTextureSize) ? maximumTextureSize : xr;
        var y2 = (yr > maximumTextureSize) ? maximumTextureSize : yr;
        
        var tile = new Float32Array(x2 * y2);
        console.log("creating texture with dimensions", x2, y2);
        // Get tile from full image
        var counter = 0;
        for (var jj = y1; jj < y1 + y2; jj++) {
          for (var ii = x1; ii < x1 + x2; ii++) {
            tile[counter] = arr[jj * width + ii];
            counter++;
          }
        }
        
        // Create texture from tile
        var index = j * xTiles + i;
        gl.activeTexture(gl["TEXTURE" + index]);
        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, x2, y2, 0, gl.LUMINANCE, gl.FLOAT, tile);
        
        var key = textureKeys[index];
        uniforms[key] = gl.getUniformLocation(program, key);
        gl.uniform1i(uniforms[key], index);
      }
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    
    // Hook up user interaction for testing
    var minEl = document.querySelector("input[data-type='min']");
    var maxEl = document.querySelector("input[data-type='max']");
    minEl.onchange = function(e) {
      var value = parseInt(e.target.value);
      extent[0] = value;
      gl.uniform2f(uniforms.uExtent, extent[0], extent[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    maxEl.onchange = function(e) {
      var value = parseInt(e.target.value);
      extent[1] = value;
      gl.uniform2f(uniforms.uExtent, extent[0], extent[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }
  
  function onDOM() {
    // Define the path and options
    var path = '/examples/data/m101.fits';
    var opts = {el: 'wicked-science-visualization'};
    
    window.ondragover = function(e) { e.preventDefault(); }
    window.ondrop = function(e) {
      e.preventDefault();
      
      var file = e.dataTransfer.files[0];
      new astro.FITS(file, getImage, opts);
    }
    
    return;
    
    // Initialize a FITS file, passing getImage function as a callback
    var f = new astro.FITS(path, getImage, opts);
  }
  
  window.addEventListener('DOMContentLoaded', onDOM, false);
})();