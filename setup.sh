# Clean up directories
rm examples/lib/*
rm examples/data/*

# Download JavaScript dependencies
curl "https://raw.github.com/astrojs/fitsjs/master/lib/fits.js" -o 'examples/lib/fits.js'

# Download data for examples
curl "http://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/data/pub/CFHTSG/W3-2%2B0.G.fits%5B16094%3A16605%2C7328%3A7839%5D" -o "examples/data/m101_g.fits"
curl "http://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/data/pub/CFHTSG/W3-2%2B0.R.fits%5B16094%3A16605%2C7328%3A7839%5D" -o "examples/data/m101_r.fits"
curl "http://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/data/pub/CFHTSG/W3-2%2B0.I.fits%5B16094%3A16605%2C7328%3A7839%5D" -o "examples/data/m101_i.fits"
