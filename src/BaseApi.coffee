
class BaseApi
  
  # Setup the DOM with a canvas
  constructor: (elem, @width, @height) ->
    
    # Attach canvas to DOM element
    @canvas = document.createElement('canvas')
    @canvas.setAttribute('width', @width)
    @canvas.setAttribute('height', @height)
    
    elem.appendChild(@canvas)
    
    # Setup variables for mouse navigation of canvas
    @scale = 2 / @width
    
    @canvas.addEventListener('mousewheel', @wheelHandler, false)
    @canvas.addEventListener('DOMMouseScroll', @wheelHandler, false)
    
  # Set global minimum and maximum pixels values. Important for
  # scaling the dynamic range.
  setGlobalExtent: (@MINIMUM, @MAXIMUM) ->
    
  wheelHandler: (e) =>
    e.preventDefault()
    
    factor = if e.shiftKey then 1.01 else 1.1
    @scale *= if (e.detail or e.wheelDelta) < 0 then factor else 1 / factor
    
    # Probably not the most efficient way to do this ...
    @scale = if @scale > @maxScale then @maxScale else @scale
    @scale = if @scale < @minScale then @minScale else @scale
  
@astro.WebFITS.BaseApi = BaseApi