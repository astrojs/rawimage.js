# WebFITS

A JavaScript library to visualize astronomical images in a web browser.  This library contains a set of functions that are frequently used to visualize the high dynamic range of astronomical images.  The following functions are currently supported:

  * Linear
  * Logarithm
  * Square Root
  * Hyperbolic Inverse Sine
  * Power (order 2)
  * Lupton Color Algorithm

Extending these should be straight-forward.


## API
    getContext()
Setup a visualization context.  For the WebGL implementation this function sets up all programs, shaders and buffers.  For the Canvas implementation this function just extracts the 2d context and sets a few internal variables.  This function is automatically called when a new WebFITS object is instantiated, but if `teardown` is called, this function needs to be explicitly called again.

    setupControls(callback)
Allow panning and zooming on the visualization context.  `callback` is an optional user-defined function that accepts three arguments: `x`, `y`, and `opts`.  The callback is executed when the mouse moves over the visualization context, passing the `x` and `y` coordinates of the image reference frame.  This is useful for getting the pixel value at a given coordinate.  See examples.

    loadImage(identifier, arr, width, height)
Imports an image to the visualization.  `identifier` is a user chosen name for the image. `arr` is a typed array representing the image of `width` and `height`.

    setImage(identifier)
After loading images with `loadImage`, a specific image may be selected using this function.

    setExtent(min, max)
Set the minimum and maximum pixels values that will be rendered.

    setStretch(stretch)
Sets the stretch for the image, the default is `linear`.  Current valid values for `stretch` are `linear`, `logarithm`, `sqrt`, `arcsinh`, `power`.

    setScales(r, g, b)
This function is relevant to color composites, setting a normalized scale for each rgb channel.

    setAlpha(value)
This function is relevant to color composites, setting the `alpha` parameter in the Lupton algorithm.

    setQ(value)
This function is relevant to color composites, setting the `Q` parameter in the Lupton algorithm.

    drawColor(r_identifier, g_identifier, b_identifier)
Render a color composite by specifying the identifiers for each channel.  Note: `setScales`, `setAlpha`, and `setQ` must be called prior to this function, this WebFITS does not provide any default values.


## Examples

Examples may be found in the `examples` directory.  To get started run:

    ./setup.sh

This script downloads the latest version of [`fits.js`](http://astrojs.github.com/fitsjs/) and sample images needed for the examples.  A local server is needed to see the examples.  If familiar with NodeJS, you may run:

    npm install .
    http-server

otherwise a local server can be started using Python.

    python -m SimpleHTTPServer


#### TODO:

  * http://jsfiddle.net/JqBs8/4/