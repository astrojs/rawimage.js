
class BaseApi
  
  # Setup the DOM with a canvas and get context
  constructor: (elem, @dimension) ->
    @width = @height = @dimension
    
    # Create and attach canvas to DOM
    @canvas = document.createElement('canvas')
    @canvas.setAttribute('width', @width)
    @canvas.setAttribute('height', @height)
    
    elem.appendChild(@canvas)
    
    # Lookup table for loaded images
    @id = 0
    @lookup = {}
    
    # Storage for image statistics
    @statistics = {}
    
    @getContext()
    @setupMouseInteraction()
  
  setupMouseInteraction: =>
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
    
    @canvas.onmousemove = (e) =>
      return unless @drag
      
      xDelta = e.clientX - @xMouseDown
      yDelta = e.clientY - @yMouseDown
      
      @xOffset = @xOldOffset + (xDelta / @width / @zoom * 2.0)
      @yOffset = @yOldOffset - (yDelta / @height / @zoom * 2.0)
      
      @draw()
    
    @canvas.onmouseout = (e) =>
      @drag = false
    
    @canvas.onmouseover = (e) =>
      @drag = false
    
    @canvas.addEventListener('mousewheel', @wheelHandler, false)
    @canvas.addEventListener('DOMMouseScroll', @wheelHandler, false)
    
  wheelHandler: (e) =>
    e.preventDefault()
    
    factor = if e.shiftKey then 1.01 else 1.1
    @zoom *= if (e.detail or e.wheelDelta) < 0 then factor else 1 / factor
    
    # Probably not the most efficient way to do this ...
    @zoom = if @zoom > @maxZoom then @maxZoom else @zoom
    @zoom = if @zoom < @minZoom then @minZoom else @zoom


@astro.WebFITS.BaseApi = BaseApi