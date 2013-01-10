
class BaseApi
  
  # Setup the DOM with a canvas
  constructor: (elem, @width, @height) ->
    
    # Attach canvas to DOM element
    @canvas = document.createElement('canvas')
    @canvas.setAttribute('class', 'webfits')
    @canvas.setAttribute('width', @width)
    @canvas.setAttribute('height', @height)
    
    elem.appendChild(@canvas)
  
  # Set global minimum and maximum pixels values. Important for
  # scaling the dynamic range.
  setGlobalExtent: (@MINIMUM, @MAXIMUM) ->
  
@astro.WebFITS.BaseApi = BaseApi