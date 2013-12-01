
FILES='
  core.js
  shaders.js'
  
mkdir -vp tmp
for f in $FILES
do
  sed 's/^/  /' src/$f > tmp/$f
done
cat src/start.js ${FILES//  /tmp\/} src/end.js > ruse.js
node_modules/.bin/uglifyjs ruse.js -o ruse.min.js
rm -rf tmp