
Api     = @astro.WebFITS.Api
Shaders = @astro.WebFITS.Shaders

class WebGL extends Api
  
  algorithm: Shaders.lupton
  textureIndices:
    'u': 0
    'g': 1
    'r': 2
    'i': 3
    'z': 4
  
  # Code using this function must check if a context is returned
  getContext: (canvas) ->
    
    # Initialize context
    for name in ['webgl', 'experimental-webgl']
      try
        context = canvas.getContext(name)
        context.viewport(0, 0, canvas.width, canvas.height)
      catch e
      break if (context)
    
    return null unless context
    @ctx = context
    
    # Check float extension support on GPU
    ext = @_getExtension(context)
    return null unless ext
    
    # Initialize shaders
    vertexShader = @_loadShader(context, Shaders.vertex, context.VERTEX_SHADER)
    return null unless vertexShader
    
    fragShader = @_loadShader(context, Shaders.fragment, context.FRAGMENT_SHADER)
    return null unless fragShader
    
    colorShader = @_loadShader(context, @algorithm, context.FRAGMENT_SHADER)
    return null unless colorShader
    
    # Create the program
    @program1 = @_createProgram(context, [vertexShader, fragShader])
    return null unless @program1
    @program2 = @_createProgram(context, [vertexShader, colorShader])
    return null unless @program2
    
    for program in [@program2, @program1]
      context.useProgram(program)
      
      # Grab attribute and uniform locations
      positionLocation  = context.getAttribLocation(program, 'a_position')
      texCoordLocation  = context.getAttribLocation(program, 'a_textureCoord')
      extentLocation    = context.getUniformLocation(program, 'u_extent')
      offsetLocation    = context.getUniformLocation(program, 'u_offset')
      scaleLocation     = context.getUniformLocation(program, 'u_scale')
      
      # TODO: Using sample data CFHTLS 26.  Global min and max precomputed and hard coded here.
      context.uniform2f(extentLocation, @minimum, @maximum)
      context.uniform2f(offsetLocation, -@width / 2, -@height / 2)
      context.uniform1f(scaleLocation, 2 / @width)
    
    # Create texture coordinate buffer
    texCoordBuffer = context.createBuffer()
    context.bindBuffer(context.ARRAY_BUFFER, texCoordBuffer)
    context.bufferData(
      context.ARRAY_BUFFER,
      new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]),
      context.STATIC_DRAW
    )
    context.enableVertexAttribArray(texCoordLocation)
    context.vertexAttribPointer(texCoordLocation, 2, context.FLOAT, false, 0, 0)
    
    buffer = context.createBuffer()
    context.bindBuffer(context.ARRAY_BUFFER, buffer)
    context.enableVertexAttribArray(positionLocation)
    context.vertexAttribPointer(positionLocation, 2, context.FLOAT, false, 0, 0)
    @_setRectangle(context, 0, 0, 401, 401)
    context.drawArrays(context.TRIANGLES, 0, 6)
    
    return context
    
  # Using underscore convention for 'private' methods
  _getExtension: (gl) ->
    return gl.getExtension('OES_texture_float')
  
  # Creates, compiles and checks for error when loading shader
  _loadShader: (gl, source, type) ->
    shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    
    compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
    unless compiled
      lastError = gl.getShaderInfoLog(shader)
      throw "Error compiling shader #{shader}: #{lastError}"
      gl.deleteShader(shader)
      return null
    
    return shader
    
  # Create the WebGL program
  _createProgram: (gl, shaders) ->
    program = gl.createProgram()
    for shader in shaders
      gl.attachShader(program, shader)
    
    gl.linkProgram(program)
    
    linked = gl.getProgramParameter(program, gl.LINK_STATUS)
    unless linked
      throw "Error in program linking: #{gl.getProgramInfoLog(program)}"
      gl.deleteProgram(program)
      return null
    
    return program

  # Set a buffer with viewport width and height
  _setRectangle: (gl, x, y, width, height) ->
      [x1, x2] = [x, x + width]
      [y1, y2] = [y, y + height]
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), gl.STATIC_DRAW)  
  
  loadTexture: (band, data) =>
    index = @textureIndices[band]
    
    @ctx.activeTexture(@ctx["TEXTURE#{index}"])
    texture = @ctx.createTexture()
    @ctx.bindTexture(@ctx.TEXTURE_2D, texture)
    @ctx.texParameteri(@ctx.TEXTURE_2D, @ctx.TEXTURE_WRAP_S, @ctx.CLAMP_TO_EDGE)
    @ctx.texParameteri(@ctx.TEXTURE_2D, @ctx.TEXTURE_WRAP_T, @ctx.CLAMP_TO_EDGE)
    @ctx.texParameteri(@ctx.TEXTURE_2D, @ctx.TEXTURE_MIN_FILTER, @ctx.NEAREST)
    @ctx.texParameteri(@ctx.TEXTURE_2D, @ctx.TEXTURE_MAG_FILTER, @ctx.NEAREST)
    @ctx.texImage2D(@ctx.TEXTURE_2D, 0, @ctx.LUMINANCE, @width, @height, 0, @ctx.LUMINANCE, @ctx.FLOAT, data)
  
  # Set scale for a channel in the color composite image
  setScale: (band, scale) ->
    @ctx.useProgram(@program2)
    
    location = @ctx.getUniformLocation(@program2, "u_#{band}scale")
    @ctx.uniform1f(location, scale)
    @ctx.drawArrays(@ctx.TRIANGLES, 0, 6)
    
  setMax: (band, max) ->
    @ctx.useProgram(@program2)
    
    location = @ctx.getUniformLocation(@program2, "u_#{band}max")
    @ctx.uniform1f(location, max)
  
  # Set the minimum and maximum pixels for scaling grayscale images
  setExtent: (min, max) ->
    @ctx.useProgram(@program1)
    
    min = (@MAXIMUM - @MINIMUM) * min / 1000 + @MINIMUM
    max = (@MAXIMUM - @MINIMUM) * max / 1000 + @MINIMUM
    
    location = @ctx.getUniformLocation(@program1, 'u_extent')
    @ctx.uniform2f(location, min, max)
    @ctx.drawArrays(@ctx.TRIANGLES, 0, 6)
  
  # Set the alpha parameter for the Lupton algorithm
  setAlpha: (value) =>
    @ctx.useProgram(@program2)
    
    location = @ctx.getUniformLocation(@program2, 'u_alpha')
    @ctx.uniform1f(location, value)
    @ctx.drawArrays(@ctx.TRIANGLES, 0, 6)
  
  # Set the Q parameter for the Lupton algorithm
  setQ: (value) =>
    @ctx.useProgram(@program2)
    
    location = @ctx.getUniformLocation(@program2, 'u_Q')
    @ctx.uniform1f(location, value)
    @ctx.drawArrays(@ctx.TRIANGLES, 0, 6)
  
  setBkgdSub: (band, value) =>
    console.warn 'TODO: Implement setBkgdSub for grayscale images'
    @ctx.useProgram(@program2)
    
    location = @ctx.getUniformLocation(@program2, "u_#{band}sky")
    @ctx.uniform1f(location, value)
    @ctx.drawArrays(@ctx.TRIANGLES, 0, 6)
  
  setColorSaturation: (value) =>
    @ctx.useProgram(@program2)
    
    location = @ctx.getUniformLocation(@program2, 'u_colorsat')
    @ctx.uniform1f(location, value)
    @ctx.drawArrays(@ctx.TRIANGLES, 0, 6)
  
  drawGrayscale: (band) ->
    @ctx.useProgram(@program1)
    
    index = @textureIndices[band]
    @ctx.activeTexture(@ctx["TEXTURE#{index}"])
    location = @ctx.getUniformLocation(@program1, "u_tex")
    @ctx.uniform1i(location, index)
    @ctx.drawArrays(@ctx.TRIANGLES, 0, 6)
  
  # Pass three arrays to three GPU textures
  drawColor: ->
    @ctx.useProgram(@program2)
    
    for band in ['g', 'r', 'i']
      index = @textureIndices[band]
      @ctx.activeTexture(@ctx["TEXTURE#{index}"])
      location = @ctx.getUniformLocation(@program2, "u_tex#{index}")
      @ctx.uniform1i(location, index)
    
    @ctx.drawArrays(@ctx.TRIANGLES, 0, 6)


@astro.WebFITS.WebGL = WebGL