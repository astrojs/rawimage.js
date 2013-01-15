
BaseApi = @astro.WebFITS.BaseApi

class Api extends BaseApi
  nTextures: 0
  textures: {}
  alpha: 0.03
  Q: 1.0
  scale: {}
  
  constructor: ->
    super
    
    # Set default stretch function
    @stretch = (value) -> value
    
    # Difference debounce rates depending on device
    debounceRate = if /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) then 150 else 50
    
    # Debounced draw functions for better perceived performance
    @drawColorDebounce      = _.debounce(@drawColor, debounceRate)
    @drawGrayscaleDebounce  = _.debounce( =>
      @drawGrayscale(@currentBand)
    , debounceRate)
    
    # Custom event for broadcasting new dataset
    @texReadyEvt = document.createEvent("HTMLEvents")
    @texReadyEvt.initEvent("astro:webfits:texready", false, true)
    
    # Bind function to event
    document.addEventListener("astro:webfits:texready", @textureLoaded, false)
    
  getContext: ->
    # Flip Y axis with CSS
    @canvas.style.webkitTransform = 'scaleY(-1)'
    @canvas.style.MozTransform    = 'scaleY(-1)'
    @ctx = @canvas.getContext('2d')
    
    return @ctx
  
  setupMouseInteraction: =>
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
    
  # Store a reference to the color bands on the object
  loadTexture: (band, data) =>
    @textures[band] = new Float32Array(data)
    document.dispatchEvent(@texReadyEvt)
  
  textureLoaded: =>
    @nTextures += 1
    if @nTextures is 5
      @canvas.style.webkitTransform = "scaleX(1) scaleY(-1)"
      @canvas.style.MozTransform    = "scaleX(1) scaleY(-1)"
    @nTextures %= 5
  
  setScale: (band, value) ->
    @scale[band] = value
    @drawColorDebounce()
  
  setExtent: (min, max) ->
    @minimum = (@MAXIMUM - @MINIMUM) * min / @steps + @MINIMUM
    @maximum = (@MAXIMUM - @MINIMUM) * max / @steps + @MINIMUM
    @drawGrayscaleDebounce()
  
  setAlpha: (value) ->
    @alpha = value
    @drawColorDebounce()
  
  setQ: (value) ->
    @Q = value
    @drawColorDebounce()
  
  # Set the stretch parameter for grayscale images
  setStretch: (value) =>
    switch value
      when 'logarithm'
        @stretch = (value) ->
          return Math.log(value / 0.05 + 1.0) / Math.log(1.0 / 0.05 + 1.0)
      when 'sqrt'
        @stretch = (value) ->
          return Math.sqrt(value)
      when 'arcsinh'
        @stretch = (value) =>
          return @arcsinh(value / -0.033) / @arcsinh(1.0 / -0.033)
      when 'power'
        @stretch = (value) ->
          return Math.pow(value, 2)
      else
        @stretch = (value) -> value
    @drawGrayscale()
  
  setBand: (band) =>
    @activeBand = band
  
  drawGrayscale: =>
    # Cache the data
    data = @textures[@activeBand]
    
    # Get canvas data
    imgData = @ctx.getImageData(0, 0, @width, @height)
    arr = imgData.data
    min = @stretch(@minimum)
    max = @stretch(@maximum)
    range = max - min
    
    length = arr.length
    while length -= 4
      value = 255 * (@stretch(data[length / 4]) - min) / range
      arr[length + 0] = value
      arr[length + 1] = value
      arr[length + 2] = value
      arr[length + 3] = 255
      
    imgData.data = arr
    @ctx.putImageData(imgData, 0, 0)
  
  draw: =>
    transform = [
      "scaleX(#{@zoom})",
      "scaleY(#{-@zoom})",
      "translateX(#{@xOffset}px)",
      "translateY(#{@yOffset}px)"
    ].join(' ')
    @canvas.style.webkitTransform = transform
    @canvas.style.MozTransform    = transform
  
  # TODO: Improve performance using Int32Array, some bitwise operators and ternary clamp function
  drawColor: =>
    # Cache some objects
    iBand = @textures['i']
    rBand = @textures['r']
    gBand = @textures['g']
    iScale = @scale['i']
    rScale = @scale['r']
    gScale = @scale['g']
    
    # Initialize offscreen canvas
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
      r = iBand[index] * iScale
      g = rBand[index] * rScale
      b = gBand[index] * gScale
      
      # Compute total intensity and stretch factor
      I = r + g + b + 1e-10
      factor = @arcsinh(@alpha * @Q * I) / (@Q * I)
      
      arr[length + 0] = 255 * r * factor
      arr[length + 1] = 255 * g * factor
      arr[length + 2] = 255 * b * factor
      arr[length + 3] = 255
    
    imgData.data = arr
    ctx.putImageData(imgData, 0, 0)
    @ctx.drawImage(canvas, 0, 0)
    
  arcsinh: (value) ->
    return Math.log(value + Math.sqrt(1 + value * value))    
  
  wheelHandler: (e) =>
    super
    @draw()


@astro.WebFITS.Api = Api