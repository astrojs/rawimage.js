# WebFITS

A JavaScript library to visualize astronomical images in a web browser.  This library contains a set of functions that are frequently used to visualize the high dynamic range of astronomical images.  The following functions are currently supported:

  * Linear
  * Logarithm
  * Square Root
  * Hyperbolic Inverse Sine
  * Power (order 2)
  * Lupton Color Algorithm

Extending these should be straight-forward.

###### Note: Currently only the WebGL API works.

## API


    getContext
Initialize a visualization context by initializing 

    setupControls
Allow panning and zooming on the visualization context.

    loadImage(identifier, arr, width, height)
Imports an image to the visualization.  `identifier` is a user chosen name for the image. `arr` is a typed array representing the image of `width` and `height`.

    setImage(identifier)
After loading images with `loadImage`, a specific image may be selected using this function.

    setStretch(stretch)
Sets the stretch for the image.  Currently valid values for `stretch` are `linear`, `logarithm`, `sqrt`, `arcsinh`, `power`.

    setScales(r, g, b)
This function is relevant to color composites, setting a normalized scale for each rgb channel.

    setAlpha(value)
This function is relevant to color composites, setting the `alpha` parameter in the Lupton algorithm.

    setQ(value)
This function is relevant to color composites, setting the `Q` parameter in the Lupton algorithm.

    drawColor(r_identifier, g_identifier, b_identifier)
Render a color composite by specifying the identifiers for each channel.  Note: `setScales`, `setAlpha`, and `setQ` must be called prior to this function.


## Examples

Examples may be found in the `examples` directory.  To get started run:

    ./setup.sh

This script downloads the latest version of `fits.js` and sample images from MAST needed to run the examples.  Run a local server from the root directory to see the examples.  If familiar with NodeJS, you may run:

    npm install .
    http-server

otherwise a local server may be started using Python.

    python -m SimpleHTTPServer
