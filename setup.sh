# Clean up directories
rm examples/lib/*
rm examples/data/*

# Download JavaScript dependencies
curl "https://raw.github.com/astrojs/fitsjs/master/lib/fits.js" -o 'examples/lib/fits.js'

# Download data for examples
curl "http://archive.stsci.edu/cgi-bin/dss_search?v=poss2ukstu_red&r=14+03+12.51&d=%2B54+20+53.1&e=J2000&h=30&w=30&f=fits&c=none&fov=NONE&v3=" -o 'examples/data/m101_red.fits'
curl 'http://archive.stsci.edu/cgi-bin/dss_search?v=poss2ukstu_blue&r=14+03+12.51&d=%2B54+20+53.1&e=J2000&h=30&w=30&f=fits&c=none&fov=NONE&v3=' -o 'examples/data/m101_blue.fits'
curl 'http://archive.stsci.edu/cgi-bin/dss_search?v=poss2ukstu_ir&r=14+03+12.51&d=%2B54+20+53.1&e=J2000&h=30&w=30&f=fits&c=none&fov=NONE&v3=' -o 'examples/data/m101_ir.fits'
