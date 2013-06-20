
class BaseApi
  
  # Setup the DOM with a canvas and get context
  constructor: (@el, dimension) ->
    @_reset()
    
    @width = @height = dimension
    
    # Create and attach canvas to DOM
    @canvas = document.createElement('canvas')
    @canvas.setAttribute('width', @width)
    @canvas.setAttribute('height', @height)
    @canvas.setAttribute('class', 'visualization')
    
    @overlay = document.createElement('canvas')
    @overlay.setAttribute('width', @width)
    @overlay.setAttribute('height', @height)
    @overlay.setAttribute('class', 'overlay')
    
    # Get overlay context
    @overlayCtx = @overlay.getContext('2d')
    
    @el.appendChild(@canvas)
    @el.appendChild(@overlay)
    
    # Lookup table for loaded images
    @nImages  = 1
    @lookup   = {}
    
    return null unless @getContext()
    
    # Store the offsets of the canvas element
    @offsetLeft = @canvas.offsetLeft
    @offsetTop  = @canvas.offsetTop
    
    # Style the parent element
    parentStyle = @canvas.parentElement.style
    parentStyle.width = "#{@canvas.width}px"
    parentStyle.height = "#{@canvas.height}px"
    parentStyle.overflow = 'hidden'
    parentStyle.backgroundColor = '#252525'
    parentStyle.position = 'relative'
    
    # Style the canvases
    canvasStyle = @canvas.style
    overlayStyle = @overlay.style
    canvasStyle.position = 'absolute'
    overlayStyle.position = 'absolute'
    overlayStyle.pointerEvents = 'none'
    
    # Set control parameters
    @xOffset    = -@width / 2
    @yOffset    = -@height / 2
    @xOldOffset = @xOffset
    @yOldOffset = @yOffset
    @drag       = false
    
    @zoom       = 2 / @width
    @minZoom    = @zoom / 8
    @maxZoom    = 20 * @zoom
    @zoomX      = @zoom
    @zoomY      = @zoom
    
    # Cursor setting
    @crosshair = false
  
  # Setup panning and zooming with optional callback.
  # The callback is used to capture the coordinates in image space on mouse move.
  setupControls: (callbacks = null, opts = null) ->
    
    # Setup base mouse controls
    _onmousedown = (e) =>
      @drag = true
      
      @xOldOffset = @xOffset
      @yOldOffset = @yOffset
      @xMouseDown = e.clientX 
      @yMouseDown = e.clientY
    
    _onmouseup = (e) =>
      @drag = false
      
      # Prevents a NaN from being used
      return null unless @xMouseDown?
      
      xDelta = e.clientX - @xMouseDown
      yDelta = e.clientY - @yMouseDown
      @xOffset = @xOldOffset + (xDelta / @width / @zoom * 2.0)
      @yOffset = @yOldOffset - (yDelta / @height / @zoom * 2.0)
      
      @draw()
    
    _onmousemove = (e) =>
      if @crosshair
        @overlay.width = @overlay.width
        @overlayCtx.lineWidth = 1
        @overlayCtx.strokeStyle = '#0071e5'
      
        @overlayCtx.moveTo(0, e.layerY)
        @overlayCtx.lineTo(@width, e.layerY)
      
        @overlayCtx.moveTo(e.layerX, 0)
        @overlayCtx.lineTo(e.layerX, @height)
      
        @overlayCtx.stroke()
      
      return unless @drag
      
      xDelta = e.clientX - @xMouseDown
      yDelta = e.clientY - @yMouseDown
      
      @xOffset = @xOldOffset + (xDelta / @width / @zoom * 2.0)
      @yOffset = @yOldOffset - (yDelta / @height / @zoom * 2.0)
      
      @draw()
    
    _onmouseout = (e) =>
      @drag = false
    
    _onmouseover = (e) =>
      @drag = false
    
    # Setup callbacks if exist
    if callbacks?.onzoom?
      @zoomCallback = callbacks.onzoom
    
    if callbacks?.onmousedown?
      @canvas.onmousedown = (e) =>
        _onmousedown(e)
        callbacks.onmousedown.call(@, opts, e)
    else
      @canvas.onmousedown = (e) =>
        _onmousedown(e)
    
    if callbacks?.onmouseup?
      @canvas.onmouseup = (e) =>
        _onmouseup(e)
        callbacks.onmouseup.call(@, opts, e)
    else
      @canvas.onmouseup = (e) =>
        _onmouseup(e)
    
    if callbacks?.onmousemove?
      @canvas.onmousemove = (e) =>
        _onmousemove(e)
        
        offsetX = e.clientX - @offsetLeft
        offsetY = e.clientY - @offsetTop
        
        xDelta = -1 * (@width / 2 - offsetX) / @width / @zoom * 2.0
        yDelta = (@height / 2 - offsetY) / @height / @zoom * 2.0
        
        x = ((-1 * (@xOffset + 0.5)) + xDelta) + 1.5 << 0
        y = ((-1 * (@yOffset + 0.5)) + yDelta) + 1.5 << 0
        callbacks.onmousemove.call(@, x, y, opts, e)
    else
      @canvas.onmousemove = (e) =>
        _onmousemove(e)
    
    if callbacks?.onmouseout?
      @canvas.onmouseout = (e) =>
        _onmouseout(e)
        callbacks.onmouseout.call(@, opts, e)
    else
      @canvas.onmouseout = (e) =>
        _onmouseout(e)
    
    if callbacks?.onmouseover?
      @canvas.onmouseover = (e) =>
        _onmouseover(e)
        callbacks.onmouseover.call(@, opts, e)
    else
      @canvas.onmouseover = (e) =>
        _onmouseover(e)
    
    @canvas.addEventListener('mousewheel', @wheelHandler, false)
    @canvas.addEventListener('wheel', @wheelHandler, false)
    
  wheelHandler: (e) =>
    e.preventDefault()
    
    factor = if e.shiftKey then 1.01 else 1.1
    @zoom *= if (e.wheelDelta or e.deltaY) < 0 then 1 / factor else factor
    
    # Probably not the most efficient way to do this ...
    @zoom = if @zoom > @maxZoom then @maxZoom else @zoom
    @zoom = if @zoom < @minZoom then @minZoom else @zoom
    
    @zoomCallback?()
  
  setCursor: (type) ->
    
    # Clear canvas first
    @overlay.width = @overlay.width
    
    if type is 'crosshair'
      @crosshair = true
    else
      @crosshair = false

@astro.WebFITS.BaseApi = BaseApi