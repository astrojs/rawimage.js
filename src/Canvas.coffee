
BaseApi = @astro.WebFITS.BaseApi

class Api extends BaseApi
  nTextures: 0
  alpha: 0.03
  Q: 1.0
  scale: {}
  max: {}
  sky:
    g: 0
    r: 0
    i: 0
  
  constructor: ->
    super
    
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
    @[band] = new Float32Array(data)
    document.dispatchEvent(@texReadyEvt)
  
  textureLoaded: =>
    @nTextures += 1
    if @nTextures is 5
      @canvas.style.webkitTransform = "scaleX(1) scaleY(-1)"
      @canvas.style.MozTransform = "scaleX(1) scaleY(-1)"
    @nTextures %= 5
  
  setScale: (band, value) ->
    @scale[band] = value
    @drawColorDebounce()
  
  setMax: (band, value) ->
    @max[band] = value
  
  setExtent: (min, max) ->
    @minimum = (@MAXIMUM - @MINIMUM) * min / 1000 + @MINIMUM
    @maximum = (@MAXIMUM - @MINIMUM) * max / 1000 + @MINIMUM
    @drawGrayscaleDebounce()
  
  setAlpha: (value) ->
    @alpha = value
    @drawColorDebounce()
  
  setQ: (value) ->
    @Q = value
    @drawColorDebounce()
  
  setBkgdSub: (band, value) ->
    @sky[band] = value
  
  drawGrayscale: (band) =>
    @currentBand = band
    
    # Get canvas data
    imgData = @ctx.getImageData(0, 0, @width, @height)
    arr = imgData.data
    min = @arcsinh(@minimum)
    max = @arcsinh(@maximum)
    range = max - min
    
    length = arr.length
    while length -= 4
      value = 255 * (@arcsinh(@[band][length / 4]) - min) / range
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
    @canvas.style.MozTransform = transform
  
  drawColor: =>
    @drawColor2()
  
  # TODO: Run performance test comparing drawColor1 and drawColor2
  drawColor1: () =>
    
    # Get canvas data
    imgData = @ctx.getImageData(0, 0, @width, @height)
    length = imgData.data.length
    
    # Instantiate an array buffer and typed arrays
    buffer  = new ArrayBuffer(length)
    buffer8 = new Uint8ClampedArray(buffer)
    data    = new Uint32Array(buffer)
    
    index = @width * @height
    while index--
      # Background subtract and scale the pixels
      r = (@i[index] - @sky['i']) * @scale['i']
      g = (@r[index] - @sky['r']) * @scale['r']
      b = (@g[index] - @sky['g']) * @scale['g']
      
      # Compute total intensity and stretch factor
      I = r + g + b + 1e-10
      factor = @arcsinh(@alpha * @Q * I) / (@Q * I)
      
      r = (255 * r * factor) & 0xff
      g = (255 * g * factor) & 0xff
      b = (255 * b * factor) & 0xff
      
      data[index] = (255 << 24) | (b << 16) | (g << 8) | r
      
    imgData.data.set(buffer8)
    @ctx.putImageData(imgData, 0, 0)
  
  drawColor2: ->
    
    # Initialize offscreen canvas
    canvas = document.createElement('canvas')
    
    # TODO: Do not hard code this!!!
    canvas.width = 401
    canvas.height = 401
    
    ctx = canvas.getContext('2d')
    
    # Get canvas data
    imgData = ctx.getImageData(0, 0, @width, @height)
    arr = imgData.data
    
    length = arr.length
    while length -= 4
      index = length / 4
      r = (@i[index] - @sky['i']) * @scale['i']
      g = (@r[index] - @sky['r']) * @scale['r']
      b = (@g[index] - @sky['g']) * @scale['g']
      
      # Compute total intensity and stretch factor
      I = r + g + b + 1e-10
      factor = @arcsinh(@alpha * @Q * I) / (@Q * I)
      
      arr[length + 0] = parseInt(255 * r * factor + 0.5)
      arr[length + 1] = parseInt(255 * g * factor + 0.5)
      arr[length + 2] = parseInt(255 * b * factor + 0.5)
      arr[length + 3] = 255
    
    imgData.data = arr
    ctx.putImageData(imgData, 0, 0)
    
    @ctx.drawImage(canvas, 0, 0)
    
  arcsinh: (value) ->
    return Math.log(value + Math.sqrt(1 + value * value))
    
  clamp: (value) ->
    return Math.max(Math.min(1, value), 0)

  wheelHandler: (e) =>
    super
    @draw()


@astro.WebFITS.Api = Api