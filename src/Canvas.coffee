
BaseApi = @astro.WebFITS.BaseApi

class Api extends BaseApi
  
  constructor: ->
    @images = {}
    @scales = {}
    
    super
  
  #
  # Private Methods
  #
  
  _getContext: ->
    
    # Style the parent element
    parentStyle = @canvas.parentElement.style
    parentStyle.width = "#{@canvas.width}px"
    parentStyle.height = "#{@canvas.height}px"
    parentStyle.overflow = 'hidden'
    
    # Flip Y axis with CSS
    @canvas.style.transform = 'scaleY(-1)'
    @canvas.style.webkitTransform = 'scaleY(-1)'
    @canvas.style.MozTransform    = 'scaleY(-1)'
    @ctx = @canvas.getContext('2d')
    
    # Set default draw function
    @draw = @drawLinear
    
    return @ctx
    
  _applyTransforms: ->
    transforms = [
      "scaleX(#{@zoom})",
      "scaleY(#{-@zoom})",
      "translateX(#{@xOffset}px)",
      "translateY(#{@yOffset}px)"
    ].join(' ')
    @canvas.style.transform       = transforms
    @canvas.style.webkitTransform = transforms
    @canvas.style.MozTransform    = transforms
  
  #
  # Public Methods
  #
  
  # TODO: Check if this is necessary
  setupControls: ->
    super
    
    @xOffset  = 0
    @yOffset  = 0
    @zoom     = 1
    @minZoom  = @zoom
    @maxZoom  = 12 * @zoom
    
    @canvas.onmouseup = (e) =>
      @drag = false
      
      # Prevents a NaN from being used
      return null unless @xMouseDown?
      
      xDelta = e.clientX - @xMouseDown
      yDelta = e.clientY - @yMouseDown
      @xOffset = @xOldOffset + (xDelta / @zoom)
      @yOffset = @yOldOffset - (yDelta / @zoom)
      
      @draw()
    
    @canvas.onmousemove = (e) =>
      return unless @drag
      
      xDelta = e.clientX - @xMouseDown
      yDelta = e.clientY - @yMouseDown
      
      @xOffset = @xOldOffset + (xDelta / @zoom)
      @yOffset = @yOldOffset - (yDelta / @zoom)
      
      @draw()
  
  # Store the image
  loadImage: (identifier, arr, width, height) ->
    # Cache id, assign image to identifier and increment
    index = @id
    @lookup[identifier] = @id
    @id += 1
    
    @images[identifier] =
      arr: new Float32Array(arr)
      width: width
      height: height
    
    @setImage(identifier) unless @currentImage
    @nImages += 1
  
  # Set the image
  setImage: (identifier) ->
    @currentImage = identifier
  
  # Set the stretch parameter for grayscale images
  setStretch: (stretch) ->
    switch stretch
      when 'logarithm'
        @draw = @drawLog
      when 'sqrt'
        @draw = @drawSqrt
      when 'arcsinh'
        @draw = @drawAsinh
      when 'power'
        @draw = @drawPower
      else
        @draw = @drawLinear
    
    @draw()
  
  # Set the minimum and maximum pixels for scaling grayscale images.
  setExtent: (min, max) ->
    @minimum = min
    @maximum = max
    @draw()
  
  # Set scales for each channel in the color composite
  setScales: (r, g, b) ->
    @scales.r = r
    @scales.g = g
    @scales.b = b
    @draw()
  
  setCalibration: (value) ->
    @calibration = value
    @draw()
  
  setAlpha: (value) ->
    @alpha = value
    @draw()
  
  setQ: (value) ->
    @Q = value
    @draw()
  
  drawLinear: ->
    data = @images[@currentImage].arr
    
    # Get canvas data
    imgData = @ctx.getImageData(0, 0, @width, @height)
    arr = imgData.data
    min = @minimum
    max = @maximum
    range = max - min
    
    length = arr.length
    while length -= 4
      value = 255 * (data[length / 4] - min) / range
      arr[length + 0] = value
      arr[length + 1] = value
      arr[length + 2] = value
      arr[length + 3] = 255
      
    imgData.data = arr
    @ctx.putImageData(imgData, 0, 0)
    @_applyTransforms()
  
  drawLog: ->
    data = @images[@currentImage].arr
    
    # Get canvas data
    imgData = @ctx.getImageData(0, 0, @width, @height)
    arr = imgData.data
    
    minimum = @minimum
    min = 0
    max = @logarithm(@maximum - @minimum)
    range = max - min
    
    length = arr.length
    while length -= 4
      pixel = @logarithm(data[length / 4] - minimum)
      
      value = 255 * (pixel - min) / range
      arr[length + 0] = value
      arr[length + 1] = value
      arr[length + 2] = value
      arr[length + 3] = 255

    imgData.data = arr
    @ctx.putImageData(imgData, 0, 0)
    @_applyTransforms()
      
  # FIXME: Does not match the WebGL implementation
  drawSqrt: ->
    data = @images[@currentImage].arr
    
    # Get the canvas
    imgData = @ctx.getImageData(0, 0, @width, @height)
    arr = imgData.data
    
    minimum = @minimum
    max = @maximum - minimum
    
    length = arr.length
    while length -= 4
      pixel = data[length / 4] - minimum
      
      value = 255 * Math.sqrt(pixel / max)
      arr[length + 0] = value
      arr[length + 1] = value
      arr[length + 2] = value
      arr[length + 3] = 255
      
    imgData.data = arr
    @ctx.putImageData(imgData, 0, 0)
    @_applyTransforms()
  
  drawAsinh: ->
    data = @images[@currentImage].arr
    
    # Get the canvas
    imgData = @ctx.getImageData(0, 0, @width, @height)
    arr = imgData.data
    
    min = @scaledArcsinh(@minimum)
    max = @scaledArcsinh(@maximum)
    range = max - min
    
    length = arr.length
    while length -= 4
      pixel = @scaledArcsinh(data[length / 4])
      
      value = 255 * (pixel - min) / range
      arr[length + 0] = value
      arr[length + 1] = value
      arr[length + 2] = value
      arr[length + 3] = 255
      
    imgData.data = arr
    @ctx.putImageData(imgData, 0, 0)
    @_applyTransforms()
  
  drawPower: ->
    data = @images[@currentImage].arr
    
    # Get the canvas
    imgData = @ctx.getImageData(0, 0, @width, @height)
    arr = imgData.data
    
    min = @minimum
    max = @maximum - min
    
    length = arr.length
    while length -= 4
      pixel = data[length / 4] - min
      
      value = 255 * Math.pow(pixel / max, 2)
      arr[length + 0] = value
      arr[length + 1] = value
      arr[length + 2] = value
      arr[length + 3] = 255
      
    imgData.data = arr
    @ctx.putImageData(imgData, 0, 0)
    @_applyTransforms()
  
  # TODO: Improve performance using Int32Array, some bitwise operators and ternary clamp function
  drawLupton: ->
    rImage = @images[@r].arr
    gImage = @images[@g].arr
    bImage = @images[@b].arr
    
    rFactor = @scales.r * @calibration
    gFactor = @scales.g * @calibration
    bFactor = @scales.b * @calibration
    
    # Cache parameters in scope
    alpha = @alpha
    Q = @Q
    
    # Initialize offscreen canvas and get context
    canvas = document.createElement('canvas')
    canvas.width  = @width
    canvas.height = @height
    ctx = canvas.getContext('2d')
    
    # Get canvas data
    imgData = ctx.getImageData(0, 0, @width, @height)
    arr = imgData.data
    
    length = arr.length
    while length -= 4
      index = length / 4
      r = rImage[index] * rFactor
      g = gImage[index] * gFactor
      b = bImage[index] * bFactor
      
      # Compute total intensity and stretch factor
      I = r + g + b + 1e-10
      factor = @arcsinh(alpha * Q * I) / (Q * I)
      
      arr[length + 0] = 255 * r * factor
      arr[length + 1] = 255 * g * factor
      arr[length + 2] = 255 * b * factor
      arr[length + 3] = 255
    
    imgData.data = arr
    ctx.putImageData(imgData, 0, 0)
    @ctx.drawImage(canvas, 0, 0)
    @_applyTransforms()
  
  drawColor: (@r, @g, @b) ->
    @draw = @drawLupton
    @drawLupton()
  
  wheelHandler: (e) =>
    super
    @draw()
  
  #
  # Stretch Functions
  #
  
  logarithm: (value) ->
    return Math.log(value / 0.05 + 1.0) / Math.log(1.0 / 0.05 + 1.0)
  
  arcsinh: (value) ->
    return Math.log(value + Math.sqrt(1 + value * value))
  
  scaledArcsinh: (value) =>
    @arcsinh(value / -0.033) / @arcsinh(1.0 / -0.033)


version = @astro.WebFITS.version
@astro.WebFITS = Api
@astro.WebFITS.version = version 

