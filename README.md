# WebFITS

A JavaScript library to visualize astronomical images.  This library creates a visualization context from an array of pixels.

#### Note: None of this works yet.

## API

    webfits.init(DOM, width, height)
Initializes a visualization context on the `DOM` element with the given `width` and `height`.  In the background this function checks the capability of the browser utilizing either a WebGL or canvas context.

    webfits.setImage(pixels, width, height, statistics)
Passes an array of pixels representing an image of `width` and `height` dimensions.  Default parameters are set for visualization.  If the `statistics` argument is `true`, basic statistics are computed for a more optimal set of visualization parameters.

    webfits.updateParameter(parameter, value)
Updates the given `parameter` with `value`, and re-draws the image.


## Example


    <html>
    <head>
      <script src='fits.js'></script>
      <script src='webfits.js'></script>

      <script>
        // Define callback that is executed after image is received from the server
        function getImageData(fits) {
          
          // Get first data unit
          var dataunit = fits.getDataUnit();
          
          // Asynchronously get pixels representing the image
          dataunit.getFrameAsync(undefined, createVisualization);
          
          // If you like, pixels can be retreived synchronously,
          // however it causes the browser UI to lock.  It's fine for small
          // images, but not recommended for large images.
          // var arr = dataunit.getFrame();
        }
        
        // Define callback for when the pixels have been read from file
        function createVisualization(arr, width, height) {
          
          // Get the DOM element
          var el = document.querySelector('#wicked-science-visualization');
          
          // Initialize the WebFITS context with a viewer 600px by 600px
          webfits.init(el, 600, 600);
          webfits.setImage(arr, width, height);
        }
      
        function main() {
          
          // Path to FITS image
          var url = '/path/to/image.fits';
          
          // Get a FITS file sitting on your server
          var fits = new astro.FITS.File('/path/to/image.fits', getImageData);
        }
        
      </script>
    </head>
    <body onload='main()'>
      <div id='wicked-science-visualization'></div>
    </body>
    </html>