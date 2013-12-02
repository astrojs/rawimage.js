
FILES='
  core.js
  shaders.js
  colormaps.js
  controls.js
  gl.js
  api.js
  composite.js'
  
mkdir -vp tmp
for f in $FILES
do
  sed 's/^/  /' src/$f > tmp/$f
done
cat src/start.js ${FILES//  /tmp\/} src/end.js > rawimage.js
node_modules/.bin/uglifyjs rawimage.js -o rawimage.min.js
rm -rf tmp