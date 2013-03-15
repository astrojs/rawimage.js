
class BaseApi
  
  # Setup the DOM with a canvas and get context
  constructor: (@el, dimension) ->
    @width = @height = dimension
    
    # Create and attach canvas to DOM
    @canvas = document.createElement('canvas')
    @canvas.setAttribute('width', @width)
    @canvas.setAttribute('height', @height)
    
    @el.appendChild(@canvas)
    
    # Lookup table for loaded images
    @nImages  = 0
    @lookup   = {}
    
    return null unless @getContext()
    
    # Style the parent element
    parentStyle = @canvas.parentElement.style
    parentStyle.width = "#{@canvas.width}px"
    parentStyle.height = "#{@canvas.height}px"
    parentStyle.overflow = 'hidden'
    parentStyle.backgroundColor = '#151515'
    
    # Set control parameters
    @xOffset    = -@width / 2
    @yOffset    = -@height / 2
    @xOldOffset = @xOffset
    @yOldOffset = @yOffset
    @drag       = false
    
    @zoom       = 2 / @width
    @minZoom    = @zoom
    @maxZoom    = 12 * @zoom
    @zoomX      = @zoom
    @zoomY      = @zoom
  
  # Setup panning and zooming with optional callback.
  # The callback is used to capture the coordinates in image space on mouse move.
  setupControls: (callback = null, opts = null) ->
    
    @canvas.onmousedown = (e) =>
      @drag = true
      
      @xOldOffset = @xOffset
      @yOldOffset = @yOffset
      @xMouseDown = e.clientX 
      @yMouseDown = e.clientY
    
    @canvas.onmouseup = (e) =>
      @drag = false
      
      # Prevents a NaN from being used
      return null unless @xMouseDown?
      
      xDelta = e.clientX - @xMouseDown
      yDelta = e.clientY - @yMouseDown
      @xOffset = @xOldOffset + (xDelta / @width / @zoom * 2.0)
      @yOffset = @yOldOffset - (yDelta / @height / @zoom * 2.0)
      
      @draw()
    
    _onmousemove = (e) =>
      return unless @drag
      
      xDelta = e.clientX - @xMouseDown
      yDelta = e.clientY - @yMouseDown
      
      @xOffset = @xOldOffset + (xDelta / @width / @zoom * 2.0)
      @yOffset = @yOldOffset - (yDelta / @height / @zoom * 2.0)
      
      @draw()
    
    if callback?
      @canvas.onmousemove = (e) =>
        xDelta = -1 * (@width / 2 - e.offsetX) / @width / @zoom * 2.0
        yDelta = (@height / 2 - e.offsetY) / @height / @zoom * 2.0
        
        x = ((-1 * (@xOffset + 0.5)) + xDelta) + 1.5 << 0
        y = ((-1 * (@yOffset + 0.5)) + yDelta) + 1.5 << 0
        callback.call(@, x, y, opts)
        
        _onmousemove(e)
    else
      @canvas.onmousemove = (e) =>
        _onmousemove(e)
    
    @canvas.onmouseout = (e) =>
      @drag = false
    
    @canvas.onmouseover = (e) =>
      @drag = false
    
    @canvas.addEventListener('mousewheel', @wheelHandler, false)
    @canvas.addEventListener('DOMMouseScroll', @wheelHandler, false)
    
  wheelHandler: (e) =>
    e.preventDefault()
    
    factor = if e.shiftKey then 1.01 else 1.1
    @zoom *= if (e.detail or e.wheelDelta) < 0 then 1 / factor else factor
    
    # Probably not the most efficient way to do this ...
    @zoom = if @zoom > @maxZoom then @maxZoom else @zoom
    @zoom = if @zoom < @minZoom then @minZoom else @zoom


@astro.WebFITS.BaseApi = BaseApi