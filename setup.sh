# Clean up directories
rm examples/lib/*
rm examples/data/*

mkdir -vp examples/lib
mkdir -vp examples/data

# Download JavaScript dependencies
curl -k "https://raw.github.com/astrojs/fitsjs/rewrite/lib/fits.js" -o 'examples/lib/fits.js'

# Download data for examples
curl "http://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/data/pub/CFHTSG/W3-2%2B0.G.fits%5B16094%3A16605%2C7328%3A7839%5D" -o "examples/data/m101_g.fits"
curl "http://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/data/pub/CFHTSG/W3-2%2B0.R.fits%5B16094%3A16605%2C7328%3A7839%5D" -o "examples/data/m101_r.fits"
curl "http://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/data/pub/CFHTSG/W3-2%2B0.I.fits%5B16094%3A16605%2C7328%3A7839%5D" -o "examples/data/m101_i.fits"
curl "http://astrojs.s3.amazonaws.com/sample/m101_g_sm.fits" -o "examples/data/m101_i.fits"
curl "http://astrojs.s3.amazonaws.com/sample/CFHTLS_082_0001_g.fits.fz" -o "examples/data/CFHTLS_082_0001_g.fits.fz"
curl "http://astrojs.s3.amazonaws.com/sample/CFHTLS_082_0001_r.fits.fz" -o "examples/data/CFHTLS_082_0001_r.fits.fz"
curl "http://astrojs.s3.amazonaws.com/sample/CFHTLS_082_0001_i.fits.fz" -o "examples/data/CFHTLS_082_0001_i.fits.fz"