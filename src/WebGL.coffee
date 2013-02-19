
BaseApi = @astro.WebFITS.BaseApi
Shaders = @astro.WebFITS.Shaders

class Api extends BaseApi
  
  fShaders: ['linear', 'logarithm', 'sqrt', 'arcsinh', 'power']
  programs: {}
  previousProgram: null
  
  
  # Code using this function must check if a context is returned
  getContext: ->
    
    # Initialize context
    for name in ['webgl', 'experimental-webgl']
      try
        context = @canvas.getContext(name)
        context.viewport(0, 0, @width, @height)
      catch e
      break if (context)
    
    return null unless context
    @ctx = context
    
    # Check float extension support on GPU
    ext = @_getExtension()
    return null unless ext
    
    # Initialize shaders
    vertexShader = @_loadShader(Shaders.vertex, context.VERTEX_SHADER)
    return null unless vertexShader
    
    for key, index in @fShaders
      fragShader = @_loadShader(Shaders[key], context.FRAGMENT_SHADER)
      return null unless fragShader
      
      @programs[key] = @_createProgram(vertexShader, fragShader)
      return null unless @programs[key]
    
    # Set parameters for all programs
    for key, program of @programs
      context.useProgram(program)
      
      # Grab attribute and uniform locations
      positionLocation  = context.getAttribLocation(program, 'a_position')
      texCoordLocation  = context.getAttribLocation(program, 'a_textureCoord')
      extentLocation    = context.getUniformLocation(program, 'u_extent')
      offsetLocation    = context.getUniformLocation(program, 'u_offset')
      scaleLocation     = context.getUniformLocation(program, 'u_scale')
      
      # Set uniforms
      context.uniform2f(extentLocation, @minimum, @maximum)
      context.uniform2f(offsetLocation, -@width / 2, -@height / 2)
      context.uniform1f(scaleLocation, 2 / @width)
    
    # Set a default program
    @currentProgram = @previousProgram = @programs.linear
    
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
    @_setRectangle()
    
    return context
  
  # Arguments r, g, b are to be identifiers referencing images already initialized using loadImage.
  setupColorShader: (r, g, b) =>
    context = @ctx
    
    # Initialize shaders
    vertexShader = @_loadShader(Shaders.vertex, context.VERTEX_SHADER)
    return null unless vertexShader
    
    fragShader = @_loadShader(Shaders.color(r, g, b), context.FRAGMENT_SHADER)
    return null unless fragShader
    
    program = @programs.color = @_createProgram(vertexShader, fragShader)
    return null unless @programs.color
    
    context.useProgram(program)
    
    # Grab attribute and uniform locations
    positionLocation  = context.getAttribLocation(program, 'a_position')
    texCoordLocation  = context.getAttribLocation(program, 'a_textureCoord')
    extentLocation    = context.getUniformLocation(program, 'u_extent')
    offsetLocation    = context.getUniformLocation(program, 'u_offset')
    scaleLocation     = context.getUniformLocation(program, 'u_scale')
    
    # Set uniforms
    context.uniform2f(extentLocation, @minimum, @maximum)
    context.uniform2f(offsetLocation, -@width / 2, -@height / 2)
    context.uniform1f(scaleLocation, 2 / @width)
    
    @currentProgram = program
  
  # Using underscore convention for 'private' methods
  _getExtension: =>
    return @ctx.getExtension('OES_texture_float')
  
  # Creates, compiles and checks for error when loading shader
  _loadShader: (source, type) ->
    shader = @ctx.createShader(type)
    @ctx.shaderSource(shader, source)
    @ctx.compileShader(shader)
    
    compiled = @ctx.getShaderParameter(shader, @ctx.COMPILE_STATUS)
    unless compiled
      lastError = @ctx.getShaderInfoLog(shader)
      throw "Error compiling shader #{shader}: #{lastError}"
      @ctx.deleteShader(shader)
      return null
    
    return shader
    
  # Create the WebGL program
  _createProgram: (vshader, fshader) =>
    program = @ctx.createProgram()
    for shader in [vshader, fshader]
      @ctx.attachShader(program, shader)
    
    @ctx.linkProgram(program)
    
    linked = @ctx.getProgramParameter(program, @ctx.LINK_STATUS)
    unless linked
      throw "Error in program linking: #{@ctx.getProgramInfoLog(program)}"
      @ctx.deleteProgram(program)
      return null
    
    return program

  # Set a buffer with viewport width and height
  _setRectangle: ->
      [x1, x2] = [0, 0 + @width]
      [y1, y2] = [0, 0 + @height]
      @ctx.bufferData(@ctx.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), @ctx.STATIC_DRAW)  
  
  loadImage: (identifier, arr, width, height) ->
    
    # Cache id, assign image to identifier and increment
    index = @id
    @lookup[identifier] = @id
    @id += 1
    
    # Set up new texture
    ctx = @ctx
    ctx.activeTexture(ctx["TEXTURE#{index}"])
    texture = ctx.createTexture()
    ctx.bindTexture(ctx.TEXTURE_2D, texture)
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE)
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE)
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.NEAREST)
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.NEAREST)
    # TODO: Remove need to cast to Float32 array
    ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.LUMINANCE, width, height, 0, ctx.LUMINANCE, ctx.FLOAT, new Float32Array(arr))
    
    @getImageStatistics(identifier, arr)
    @setExtent(identifier)
    
  # Get minimum, maximum, mean, and histogram of pixels
  getImageStatistics: (identifier, arr) ->
    # Check if already computed
    return if identifier of @statistics
    
    #
    # Compute the minimum and maximum
    #
    
    # Set initial values for min/max
    index = arr.length
    while index--
      value = arr[index]
      continue if isNaN(value)
      
      [min, max] = [value, value]
      break
      
    # Continue loop to find extent
    while index--
      value = arr[index]
      continue if isNaN(value)
      if value < min
        min = value
        continue
      if value > max
        max = value
        continue
    
    # TODO: Compute percentiles
    
    # Store statistics
    @statistics[identifier] = {
      minimum: min,
      maximum: max
    }
  
  # Set scale for a channel in the color composite image
  setScale: (identifier, value) ->
    @ctx.useProgram(@programs.color)
    
    location = @ctx.getUniformLocation(@programs.color, "u_#{identifier}_scale")
    @ctx.uniform1f(location, value)
    @ctx.drawArrays(@ctx.TRIANGLES, 0, 6)
  
  # Set the minimum and maximum pixels for scaling grayscale images
  # min and max are in range of (0, @step)
  setExtent: (identifier) ->
    stats = @statistics[identifier]
    min = stats.minimum
    max = stats.maximum
    
    # Update u_extent to all programs
    for stretch in ['linear', 'logarithm', 'sqrt', 'arcsinh', 'power']
      p = @programs[stretch]
      @ctx.useProgram(p)
      location = @ctx.getUniformLocation(p, 'u_extent')
      @ctx.uniform2f(location, min, max)
    
    # Switch back to current program and draw
    @ctx.useProgram(@currentProgram)
    @ctx.drawArrays(@ctx.TRIANGLES, 0, 6)
  
  # Set the alpha parameter for the Lupton algorithm
  setAlpha: (value) =>
    @ctx.useProgram(@programs.color)
    
    location = @ctx.getUniformLocation(@programs.color, 'u_alpha')
    @ctx.uniform1f(location, value)
    @ctx.drawArrays(@ctx.TRIANGLES, 0, 6)
  
  # Set the Q parameter for the Lupton algorithm
  setQ: (value) =>
    @ctx.useProgram(@programs.color)
    
    location = @ctx.getUniformLocation(@programs.color, 'u_Q')
    @ctx.uniform1f(location, value)
    @ctx.drawArrays(@ctx.TRIANGLES, 0, 6)
    
  # Set the stretch parameter for grayscale images
  setStretch: (value) =>
    @currentProgram = @previousProgram = @programs[value]
    @ctx.useProgram(@currentProgram)
    @draw()
  
  # Set the layer
  setLayer: (identifier) =>
    @currentProgram = @previousProgram
    @ctx.useProgram(@currentProgram)
    
    # Store the layer
    @activeLayer = identifier
    
    # Activate the correct texture
    index = @lookup[identifier]
    
    @ctx.activeTexture(@ctx["TEXTURE#{index}"])
    location = @ctx.getUniformLocation(@currentProgram, "u_tex")
    @ctx.uniform1i(location, index)
  
  #
  # Drawing functions
  #
  draw: =>
    @syncVertexUniforms()
    @ctx.drawArrays(@ctx.TRIANGLES, 0, 6)
  
  # NOTE: Only called when user selects band
  drawGrayscale: => @draw()
  
  drawColor: ->
    @ctx.useProgram(@programs.color)
    @currentProgram = @programs.color
    
    @syncVertexUniforms()
    
    for identifier, index of @lookup
      @ctx.activeTexture(@ctx["TEXTURE#{index}"])
      location = @ctx.getUniformLocation(@currentProgram, "u_tex#{index}")
      @ctx.uniform1i(location, index)
    
    @ctx.drawArrays(@ctx.TRIANGLES, 0, 6)
  
  wheelHandler: (e) =>
    super
    
    location = @ctx.getUniformLocation(@currentProgram, 'u_scale')
    @ctx.uniform1f(location, @zoom)
    @ctx.drawArrays(@ctx.TRIANGLES, 0, 6)

  syncVertexUniforms: ->
    offsetLocation  = @ctx.getUniformLocation(@currentProgram, 'u_offset')
    scaleLocation   = @ctx.getUniformLocation(@currentProgram, 'u_scale')
    
    @ctx.uniform2f(offsetLocation, @xOffset, @yOffset)
    @ctx.uniform1f(scaleLocation, @zoom)


version = @astro.WebFITS.version
@astro.WebFITS = Api
@astro.WebFITS.version = version

