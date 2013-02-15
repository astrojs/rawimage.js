# Clean up directories
rm example/lib/*
rm example/data/*

# Download JavaScript dependencies
curl "https://raw.github.com/astrojs/fitsjs/master/lib/fits.js" -o 'example/lib/fits.js'

# Download data for example
curl "http://archive.stsci.edu/cgi-bin/dss_search?v=poss2ukstu_red&r=14+03+12.51&d=%2B54+20+53.1&e=J2000&h=60&w=60&f=fits&c=none&fov=NONE&v3=" -o 'example/data/m101.fits'
