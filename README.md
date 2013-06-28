# WebFITS

A JavaScript library to visualize astronomical images in a web browser.  This library contains a set of functions that are frequently used to visualize the high dynamic range of astronomical images.

## API
    
    setupControls(mouseCallbacks, opts)
Enable panning and zooming on the visualization context.  `mouseCallbacks` is an optional argument.  Providing an object with functions defined on the following keys will hook into WebFITS mouse events.  See `examples/webgl-single-image-mouse-callbacks.html` for an example.
  
  * `onmousedown`
  * `onmouseup`
  * `onmousemove`
  * `onmouseout`
  * `onmouseover`

`opts` is a second optional argument that can be used to pass values to the mouse callbacks.

    loadImage(identifier, arr, width, height)
Load an image into the visualization.  `identifier` is a user chosen name for the image. `arr` is a typed array representing the image of `width` and `height`.

    setImage(identifier)
After loading images with `loadImage`, a specific image may be selected using this function.

    setExtent(min, max)
Set the minimum and maximum pixels values that will be rendered.

    setStretch(stretch)
Sets the stretch for the image, the default is `linear`.  Current valid values for `stretch`

  * `linear`
  * `logarithm`
  * `sqrt`
  * `arcsinh`
  * `power`

-

    setScales(r, g, b)
This function is relevant to color composites, setting a normalized scale for each rgb channel.

    setAlpha(value)
This function is relevant to color composites, setting the `alpha` parameter in the modifed Lupton algorithm.

    setQ(value)
This function is relevant to color composites, setting the `Q` parameter in the modifed Lupton algorithm.

    drawColor(r_identifier, g_identifier, b_identifier)
Render a color composite by specifying the identifiers for each channel.  Note: `setScales`, `setAlpha`, and `setQ` must be called prior to this function.  WebFITS does not provide default values.


## Examples

Examples may be found in the `examples` directory.  To get started run:

    ./setup.sh

This script downloads the latest version of [`fits.js`](http://astrojs.github.com/fitsjs/) and sample images needed for the examples.  A local server is needed to see the examples.  If familiar with [Node.js](http://nodejs.org/), you may install development dependencies by running:

    npm install .

and spin up a local server

    http-server


#### TODO:

  * http://jsfiddle.net/JqBs8/4/