(function() {
  
  // Define shader source and needed references
  var vertexShaderSrc = [
    "attribute vec2 aPosition;",
    "attribute vec2 aTextureCoordinate;",
    
    "uniform vec2 uOffset;",
    "uniform float uScale;",
    
    "varying vec2 vTextureCoordinate;",
    
    "void main() {",
      // "vec2 position = aPosition + uOffset;",
      // "position = position * uScale;",
      "gl_Position = vec4(aPosition, 0.0, 1.0);",
      
      "vTextureCoordinate = aTextureCoordinate;",
    "}"
  ];
  
  var textureAddress = 1;
  var fragmentShaderSrc = [
    "precision mediump float;",
  
    "uniform sampler2D uTexture00;",
    "uniform vec2 uExtent;",
    "uniform float uXTiles;",
    "uniform float uYTiles;",
  
    "varying vec2 vTextureCoordinate;",
    
    "vec4 textureLookup(vec2 textureCoordinate) {",
      "vec4 pixel;",
      
      // Working in texture coordinates [0, 1]
      // Given a coordinate need to figure out the texture to pick
      
      // 1.0 comes from the range in the texture frame
      "float dx = 1.0 / uXTiles;",
      "float dy = 1.0 / uYTiles;",
      
      "vec2 delta = vec2(dx, dy);",
      "vec2 scaledPosition;",
      
      "if (textureCoordinate.x < (1.0 * dx)) {",
        
        "if (textureCoordinate.y < (1.0 * dy)) {",
          
          "scaledPosition = (vTextureCoordinate - vec2(0.0 * dx, 0.0 * dy)) / delta;",
          "pixel = texture2D(uTexture00, scaledPosition);",
          
        "} else if (textureCoordinate.y < (2.0 * dy)) {",
          
          "scaledPosition = (vTextureCoordinate - vec2(0.0 * dx, 1.0 * dy)) / delta;",
          "pixel = texture2D(uTexture01, scaledPosition);",
          
        "} else if (textureCoordinate.y < (3.0 * dy)) {",
          
          "scaledPosition = (vTextureCoordinate - vec2(0.0 * dx, 2.0 * dy)) / delta;",
          "pixel = texture2D(uTexture02, scaledPosition);",
          
        "} else {",
          
          "scaledPosition = (vTextureCoordinate - vec2(0.0 * dx, 3.0 * dy)) / delta;",
          "pixel = texture2D(uTexture03, scaledPosition);",
          
        "}",
        
      "} else if (textureCoordinate.x < (2.0 * dx)) {",
        
        "if (textureCoordinate.y < (1.0 * dy)) {",
          
          "scaledPosition = (vTextureCoordinate - vec2(1.0 * dx, 0.0 * dy)) / delta;",
          "pixel = texture2D(uTexture10, scaledPosition);",
          
        "} else if (textureCoordinate.y < (2.0 * dy)) {",
          
          "scaledPosition = (vTextureCoordinate - vec2(1.0 * dx, 1.0 * dy)) / delta;",
          "pixel = texture2D(uTexture11, scaledPosition);",
          
        "} else if (textureCoordinate.y < (3.0 * dy)) {",
          
          "scaledPosition = (vTextureCoordinate - vec2(1.0 * dx, 2.0 * dy)) / delta;",
          "pixel = texture2D(uTexture12, scaledPosition);",
          
        "} else {",
          
          "scaledPosition = (vTextureCoordinate - vec2(1.0 * dx, 3.0 * dy)) / delta;",
          "pixel = texture2D(uTexture13, scaledPosition);",
          
        "}",
        
      "} else if (textureCoordinate.x < (3.0 * dx)) {",
        
        "if (textureCoordinate.y < (1.0 * dy)) {",
          
          "scaledPosition = (vTextureCoordinate - vec2(2.0 * dx, 0.0 * dy)) / delta;",
          "pixel = texture2D(uTexture20, scaledPosition);",
          
        "} else if (textureCoordinate.y < (2.0 * dy)) {",
          
          "scaledPosition = (vTextureCoordinate - vec2(2.0 * dx, 1.0 * dy)) / delta;",
          "pixel = texture2D(uTexture21, scaledPosition);",
          
        "} else if (textureCoordinate.y < (3.0 * dy)) {",
          
          "scaledPosition = (vTextureCoordinate - vec2(2.0 * dx, 2.0 * dy)) / delta;",
          "pixel = texture2D(uTexture22, scaledPosition);",
          
        "} else {",
          
          "scaledPosition = (vTextureCoordinate - vec2(2.0 * dx, 3.0 * dy)) / delta;",
          "pixel = texture2D(uTexture23, scaledPosition);",
          
        "}",
        
      "} else {",
        
        "if (textureCoordinate.y < (1.0 * dy)) {",
        
          "scaledPosition = (vTextureCoordinate - vec2(3.0 * dx, 0.0 * dy)) / delta;",
          "pixel = texture2D(uTexture30, scaledPosition);",
        
        "} else if (textureCoordinate.y < (2.0 * dy)) {",
        
          "scaledPosition = (vTextureCoordinate - vec2(3.0 * dx, 1.0 * dy)) / delta;",
          "pixel = texture2D(uTexture31, scaledPosition);",
        
        "} else if (vTextureCoordinate.y < (3.0 * dy)) {",
        
          "scaledPosition = (vTextureCoordinate - vec2(3.0 * dx, 2.0 * dy)) / delta;",
          "pixel = texture2D(uTexture32, scaledPosition);",
        
        "} else {",
          
          "scaledPosition = (vTextureCoordinate - vec2(3.0 * dx, 3.0 * dy)) / delta;",
          "pixel = texture2D(uTexture33, scaledPosition);",
          
        "}",
        
      "}",
      
      "return pixel;",
    "}",
    
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
  
  var textureLookupFn = [
    "vec4 textureLookup(vec2 textureCoordinate) {",
      "vec4 pixel;",
      
      "float dx = 1.0 / uXTiles;",
      "float dy = 1.0 / uYTiles;",
      
      "vec2 delta = vec2(dx, dy);",
      "vec2 scaledPosition;",
      
      "return pixel;",
    "}",
  ];
  
  // Create a texture look up function for the fragment shader.
  function getTextureLookupFn(xTiles, yTiles) {
    
    conditionals = {};
    conditionals[0] = "if";
    conditionals[xTiles - 1] = "else";
    
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
        fn.push("\t\tscaledPosition = (vTextureCoordinate - vec2(" + x + ".0 * dx, " + y + ".0 * dy)) / delta;");
        fn.push("\t\tpixel = texture2D(uTexture" + x + "" + y + ", scaledPosition);");
        fn.push("\t}");  
      }
      fn.push("}")
    }
    fn.push("return pixel;");
    
    console.log(fn.join('\n'));
    return fn.join("\n");
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
    var maximumTextureSize = 256 || gl.getParameter(gl.MAX_TEXTURE_SIZE);
    
    tileCoordinates = [];
    xTiles = width / maximumTextureSize;
    yTiles = height / maximumTextureSize;
    
    // TODO: Shouldn't need to check anything here. 
    xTiles = (width % maximumTextureSize === 0) ? xTiles : ~~xTiles + 1;
    yTiles = (height % maximumTextureSize === 0) ? yTiles : ~~yTiles + 1;
    
    
    // TEST: Generated texture lookup function
    getTextureLookupFn(xTiles, yTiles);
    
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
    
    var aPosition = gl.getAttribLocation(program, 'aPosition');
    var aTextureCoordinate = gl.getAttribLocation(program, 'aTextureCoordinate');
    
    var x1 = y1 = -1.0;
    var x2 = y2 = 1.0;
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
    
    textureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER, 
      new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(aTextureCoordinate);
    gl.vertexAttribPointer(aTextureCoordinate, 2, gl.FLOAT, false, 0, 0);
    
    // Tile image
    for (var j = 0; j < yTiles; j++) {
      for (var i = 0; i < xTiles; i++) {
        var tile = new Float32Array(maximumTextureSize * maximumTextureSize);
        
        var x1 = i * maximumTextureSize;
        var y1 = j * maximumTextureSize;
        var x2 = maximumTextureSize - ( (x1 + maximumTextureSize) % width ) % maximumTextureSize;
        var y2 = maximumTextureSize;
        
        var nonDataWidth = maximumTextureSize - x2;
        
        // Get tile from full image
        var counter = 0;
        for (var jj = y1; jj < y1 + y2; jj++) {
          for (var ii = x1; ii < x1 + x2; ii++) {
            
            // // NOTE: Scaling on CPU to debug
            // tile[counter] = (arr[jj * width + ii] - extent[0]) / (extent[1] - extent[0]);
            tile[counter] = arr[jj * width + ii];
            counter++;
          }
          counter += nonDataWidth;
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
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, maximumTextureSize, maximumTextureSize, 0, gl.LUMINANCE, gl.FLOAT, tile);
        
        var key = textureKeys[index];
        uniforms[key] = gl.getUniformLocation(program, key);
        gl.uniform1i(uniforms[key], index);
      }
    }
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    
    var inputEl = document.querySelector("input");
    inputEl.onchange = function(e) {
      var value = parseInt(e.target.value);
      gl.uniform2f(uniforms.uExtent, value, extent[1]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    // getTile(arr, extent);
  }
  
  // Testing function to get corner tile
  function getTile(arr, extent) {
    var imageWidth = 891;
    
    var tileWidth = tileHeight = 256;
    
    var tile = new Float32Array(tileWidth * tileHeight);
    var x1 = 3 * 256,
        x2 = tileWidth,
        y1 = 0,
        y2 = tileHeight;
    
    var dataWidth = tileWidth - ((x1 + x2) % imageWidth) % tileWidth;
    var remainderWidth = tileWidth - dataWidth;
    
    counter = 0;
    for (var jj = y1; jj < y1 + y2; jj++) {
      for (var ii = x1; ii < x1 + dataWidth; ii++) {
        tile[counter] = (arr[jj * imageWidth + ii] - extent[0]) / (extent[1] - extent[0]);
        counter += 1;
      }
      counter += remainderWidth;
    }
    
    var canvas = document.querySelector("#tile");
    var ctx = canvas.getContext("2d");
    var imgData = ctx.createImageData(tileWidth, tileHeight);
    for (var i = 0; i < imgData.data.length; i += 4) {
      var index = i / 4;
      var pixel = 255 * tile[index];
      
      imgData.data[i+0] = pixel;
      imgData.data[i+1] = pixel;
      imgData.data[i+2] = pixel;
      imgData.data[i+3] = 255;
    }
    
    ctx.putImageData(imgData, 0, 0);
  }
  
  function onDOM() {
    
    // Define the path and options
    var path = '/examples/data/m101.fits'
    var opts = {el: 'wicked-science-visualization'};
    
    // Initialize a FITS file, passing getImage function as a callback
    var f = new astro.FITS(path, getImage, opts);
  }
  
  window.addEventListener('DOMContentLoaded', onDOM, false);
})();