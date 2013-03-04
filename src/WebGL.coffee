
BaseApi = @astro.WebFITS.BaseApi
Shaders = @astro.WebFITS.Shaders

class Api extends BaseApi
  fShaders: ['linear', 'logarithm', 'sqrt', 'arcsinh', 'power', 'color']
  
  constructor: ->
    @programs = {}
    
    super
  
  #
  # Private Methods
  #
  
  # Check support for floating point textures
  _getExtension: ->
    return @ctx.getExtension('OES_texture_float')
  
  # Creates, compiles and checks for error when loading shader
  _loadShader: (source, type) ->
    ctx = @ctx
    
    shader = ctx.createShader(type)
    ctx.shaderSource(shader, source)
    ctx.compileShader(shader)
    
    compiled = ctx.getShaderParameter(shader, ctx.COMPILE_STATUS)
    unless compiled
      lastError = ctx.getShaderInfoLog(shader)
      throw "Error compiling shader #{shader}: #{lastError}"
      ctx.deleteShader(shader)
      return null
      
    return shader

  # Initialize program with vertex and fragment shader
  _createProgram: (vshader, fshader) ->
    ctx = @ctx
    
    program = ctx.createProgram()
    ctx.attachShader(program, vshader)
    ctx.attachShader(program, fshader)
    
    ctx.linkProgram(program)
    
    linked = ctx.getProgramParameter(program, ctx.LINK_STATUS)
    unless linked
      throw "Error in program linking: #{ctx.getProgramInfoLog(program)}"
      ctx.deleteProgram(program)
      return null
    
    return program
    
  # Set a buffer with viewport width and height
  _setRectangle: (ctx, width, height) ->
    [x1, x2] = [0, 0 + width]
    [y1, y2] = [0, 0 + height]
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), ctx.STATIC_DRAW)
    
  # Update the vertex uniforms (used for mouse interactions)
  _updateUniforms: (program) ->
    offsetLocation  = @ctx.getUniformLocation(program, 'u_offset')
    scaleLocation   = @ctx.getUniformLocation(program, 'u_scale')
    
    @ctx.uniform2f(offsetLocation, @xOffset, @yOffset)
    @ctx.uniform1f(scaleLocation, @zoom)
  
  # Initializes WebGL context, programs and buffers.  Error handling is done by checking the
  # return value of this function.
  _getContext: ->
    
    # Initialize context
    for name in ['webgl', 'experimental-webgl']
      try
        ctx = @canvas.getContext(name)
        width = @canvas.width
        height = @canvas.height
        ctx.viewport(0, 0, width, height)
      catch e
      break if (ctx)
    
    return null unless ctx
    @ctx = ctx
    
    ext = @_getExtension()
    return null unless ext
    
    # Initialize shaders
    vertexShader = @_loadShader(Shaders.vertex, ctx.VERTEX_SHADER)
    return null unless vertexShader
    
    # Initialize programs
    for key, index in @fShaders
      fragShader = @_loadShader(Shaders[key], ctx.FRAGMENT_SHADER)
      return null unless fragShader
      
      @programs[key] = @_createProgram(vertexShader, fragShader)
      return null unless @programs[key]
    
    # Set program specific parameters for each program
    for key, program of @programs
      ctx.useProgram(program)
      
      # Get attribute and uniform locations
      positionLocation  = ctx.getAttribLocation(program, 'a_position')
      texCoordLocation  = ctx.getAttribLocation(program, 'a_textureCoord')
      offsetLocation    = ctx.getUniformLocation(program, 'u_offset')
      scaleLocation     = ctx.getUniformLocation(program, 'u_scale')
      
      # Set uniforms
      ctx.uniform2f(offsetLocation, -width / 2, -height / 2)
      ctx.uniform1f(scaleLocation, 2 / width)
    
    # Set default program
    @currentProgram = @programs.linear
    
    # Create texture coordinate buffer
    texCoordBuffer = ctx.createBuffer()
    ctx.bindBuffer(ctx.ARRAY_BUFFER, texCoordBuffer)
    ctx.bufferData(
      ctx.ARRAY_BUFFER,
      new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]),
      ctx.STATIC_DRAW
    )
    ctx.enableVertexAttribArray(texCoordLocation)
    ctx.vertexAttribPointer(texCoordLocation, 2, ctx.FLOAT, false, 0, 0)
    
    buffer = ctx.createBuffer()
    ctx.bindBuffer(ctx.ARRAY_BUFFER, buffer)
    ctx.enableVertexAttribArray(positionLocation)
    ctx.vertexAttribPointer(positionLocation, 2, ctx.FLOAT, false, 0, 0)
    
    return ctx
  
  #
  # Public Methods
  #
  
  # Create a texture from an array representing an image.  Optional parameter computes
  # relevant statistics used for rendering grayscale images.
  loadImage: (identifier, arr, width, height) ->
    ctx = @ctx
    @_setRectangle(ctx, width, height)
    
    # Cache id, assign image to identifier and increment
    index = @id
    @lookup[identifier] = @id
    @id += 1
    
    # Set up new texture
    ctx.activeTexture(ctx["TEXTURE#{index}"])
    texture = ctx.createTexture()
    ctx.bindTexture(ctx.TEXTURE_2D, texture)
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE)
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE)
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.NEAREST)
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.NEAREST)
    
    # TODO: Remove need to cast to Float32 array
    ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.LUMINANCE, width, height, 0, ctx.LUMINANCE, ctx.FLOAT, new Float32Array(arr))
    
    @nImages += 1
  
  # Select the image to render.  This function is to be used only for grayscale renderings.
  setImage: (identifier) ->
    index = @lookup[identifier]
    
    @ctx.activeTexture(@ctx["TEXTURE#{index}"])
    location = @ctx.getUniformLocation(@currentProgram, "u_tex")
    @ctx.uniform1i(location, index)
    
    @currentImage = identifier
  
  # Set the stretch parameter for grayscale images
  setStretch: (stretch) ->
    @currentProgram = @programs[stretch]
    @ctx.useProgram(@currentProgram)
    @setImage(@currentImage)  # update program with current texture
    @draw()
  
  # Set the minimum and maximum pixels for scaling grayscale images.
  setExtent: (min, max) ->
    ctx = @ctx
    
    # Update u_extent to all programs'
    for stretch in ['linear', 'logarithm', 'sqrt', 'arcsinh', 'power']
      program = @programs[stretch]
      ctx.useProgram(program)
      location = ctx.getUniformLocation(program, 'u_extent')
      ctx.uniform2f(location, min, max)
      
    # Switch back to current program and draw
    ctx.useProgram(@currentProgram)
    ctx.drawArrays(ctx.TRIANGLES, 0, 6)
  
  # Set scales for each channel in the color composite
  setScales: (r, g, b) ->
    ctx = @ctx
    program = @programs.color
    ctx.useProgram(program)
    
    location = ctx.getUniformLocation(program, "u_r_scale")
    ctx.uniform1f(location, r)
    
    location = ctx.getUniformLocation(program, "u_g_scale")
    ctx.uniform1f(location, g)
    
    location = ctx.getUniformLocation(program, "u_b_scale")
    ctx.uniform1f(location, b)
    
    ctx.drawArrays(ctx.TRIANGLES, 0, 6)
  
  # Calibration factor typically used to convert pixel values to flux units
  setCalibration: (value) ->
    ctx = @ctx
    ctx.useProgram(@programs.color)
    
    location = ctx.getUniformLocation(@programs.color, 'u_calibration')
    ctx.uniform1f(location, value)
    ctx.drawArrays(ctx.TRIANGLES, 0, 6)
  
  # Set the alpha parameter for the Lupton algorithm
  setAlpha: (value) ->
    ctx = @ctx
    ctx.useProgram(@programs.color)
    
    location = ctx.getUniformLocation(@programs.color, 'u_alpha')
    ctx.uniform1f(location, value)
    ctx.drawArrays(ctx.TRIANGLES, 0, 6)
  
  # Set the Q parameter for the Lupton algorithm
  setQ: (value) ->
    ctx = @ctx
    ctx.useProgram(@programs.color)
    
    location = ctx.getUniformLocation(@programs.color, 'u_Q')
    ctx.uniform1f(location, value)
    ctx.drawArrays(ctx.TRIANGLES, 0, 6)
  
  #
  # Drawing functions
  #
  draw: ->
    @_updateUniforms(@currentProgram)
    @ctx.drawArrays(@ctx.TRIANGLES, 0, 6)
  
  drawColor: (r, g, b) ->
    ctx = @ctx
    
    program = @currentProgram = @programs.color
    ctx.useProgram(program)
    
    location = ctx.getUniformLocation(program, "u_tex0")
    ctx.uniform1i(location, @lookup[r])
    
    location = ctx.getUniformLocation(program, "u_tex1")
    ctx.uniform1i(location, @lookup[g])
    
    location = ctx.getUniformLocation(program, "u_tex2")
    ctx.uniform1i(location, @lookup[b])
    
    @draw()
    
  wheelHandler: (e) ->
    super
    
    location = @ctx.getUniformLocation(@currentProgram, 'u_scale')
    @ctx.uniform1f(location, @zoom)
    @ctx.drawArrays(@ctx.TRIANGLES, 0, 6)


version = @astro.WebFITS.version
@astro.WebFITS = Api
@astro.WebFITS.version = version

