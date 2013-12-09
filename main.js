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
      "position = position * uScale;",
      "gl_Position = vec4(position, 0.0, 1.0);",
      
      "vTextureCoordinate = aTextureCoordinate;",
    "}"
  ];
  
  var textureAddress = 1;
  var fragmentShaderSrc = [
    "precision mediump float;",
  
    "uniform sampler2D uTexture00;",
    "uniform vec2 uExtent;",
  
    "varying vec2 vTextureCoordinate;",
  
    "void main() {",
      "vec4 pixel_v = texture2D(uTexture00, vTextureCoordinate);",
      
      "float min = uExtent[0];",
      "float max = uExtent[1];",
      // "float pixel = (pixel_v.r - min) / (max - min);",
      "float pixel = pixel_v.r;",
      
      "gl_FragColor = vec4(pixel, pixel, pixel, 0.0);",
    "}"
  ];
  
  // Define shader uniforms
  var uniformKeys = ['uOffset', 'uScale', 'uExtent'];
  
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
    gl.viewport(0, 0, 500, 500);
    var ext = gl.getExtension('OES_texture_float');
    
    //
    // With the image dimensions generate an appropriate fragment shader
    //
    var maximumTextureSize = 256 || gl.getParameter(gl.MAX_TEXTURE_SIZE);
    
    tileCoordinates = [];
    xTiles = width / maximumTextureSize;
    yTiles = height / maximumTextureSize;
  
    xTiles = (width % maximumTextureSize === 0) ? xTiles : ~~xTiles + 1;
    yTiles = (height % maximumTextureSize === 0) ? yTiles : ~~yTiles + 1;
    
    // Generate a fragment shader with xTiles * yTiles textures
    var textureSrc = [textureAddress, 1];
    var textureKeys = [];
    // var textures = {};
    for (var j = 0; j < yTiles; j++) {
      for (var i = 0; i < xTiles; i++) {
        var index = j * xTiles + i;
        
        textureSrc.push("uniform sampler2D uTexture" + i + "" + j + ";");
        textureKeys.push("uTexture" + i + "" + j);
        
        // // Create textures first otherwise, the uniform locations are null
        // gl.activeTexture(gl["TEXTURE" + index]);
        // var texture = gl.createTexture();
        // gl.bindTexture(gl.TEXTURE_2D, texture);
        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        // 
        // textures[i + "" + j] = texture;
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
    
    var uniforms = {};
    uniformKeys.forEach(function(key) {
      uniforms[key] = gl.getUniformLocation(program, key);
    }, this);
    
    var aPosition = gl.getAttribLocation(program, 'aPosition');
    var aTextureCoordinate = gl.getAttribLocation(program, 'aTextureCoordinate');
    
    textureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER, 
      new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(aTextureCoordinate);
    gl.vertexAttribPointer(aTextureCoordinate, 2, gl.FLOAT, false, 0, 0);
    
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
    
    // Tile image
    for (var j = 0; j < yTiles; j++) {
      for (var i = 0; i < xTiles; i++) {
        var tile = new Float32Array(maximumTextureSize * maximumTextureSize);
        var x1 = i * maximumTextureSize;
        var x2 = maximumTextureSize;
        var y1 = j * maximumTextureSize;
        var y2 = maximumTextureSize;
        
        // Set vertices on position buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), gl.STATIC_DRAW);
        
        // Get tile from full image
        var counter = 0;
        for (var jj = y1; jj < y1 + y2; jj++) {
          for (var ii = x1; ii < x1 + x2; ii++) {
            // NOTE: Scaling on CPU to debug
            tile[counter] = (arr[jj * width + ii] - extent[0]) / (extent[1] - extent[0]);
            counter++;
          }
        }
        
        // Create texture
        var index = j * xTiles + i;
        gl.activeTexture(gl["TEXTURE" + index]);
        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, x2, y2, 0, gl.LUMINANCE, gl.FLOAT, tile);
      }
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    textureKeys.forEach(function(key, index) {
      console.log(key);
      uniforms[key] = gl.getUniformLocation(program, key);
      gl.uniform1i(uniforms[key], index);
    }, this);
    console.log(uniforms);
    
    window.gl = gl;
    window.program = program;
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