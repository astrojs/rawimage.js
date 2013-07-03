{print} = require 'util'
{spawn} = require 'child_process'


build = (order, output) ->
  # Set the flags for coffeescript compilation
  flags = ['-j', output, '-c'].concat order
  
  # Compile to JavaScript
  coffee = spawn 'coffee', flags
  
  coffee.stderr.on 'data', (data) ->
    process.stderr.write data.toString()
  coffee.stdout.on 'data', (data) ->
    print data.toString()

buildWebGl = ->
  
  # Get package.json
  pkg = require('./package.json')
  name = pkg['name'].toLowerCase()
  
  # Specify the name of the library
  output = "lib/#{name}-gl.js"
  
  order = [
    'src/WebFITS.coffee',
    'src/BaseApi.coffee',
    'src/Shaders.coffee',
    'src/ColorMaps.coffee',
    'src/WebGL.coffee'
  ]
  
  build(order, output)

buildCanvas = ->
  
  # Get package.json
  pkg = require('./package.json')
  name = pkg['name'].toLowerCase()
  
  # Specify the name of the library
  output = "lib/#{name}-canvas.js"
  
  order = [
    'src/WebFITS.coffee',
    'src/BaseApi.coffee',
    'src/Canvas'
  ]
  
  build(order, output)

task 'build', 'Build lib/ from src/', ->
  buildWebGl()
  buildCanvas()

task 'build:webgl', 'Build lib/ from src/', ->
  buildWebGl()

task 'build:canvas', 'Build lib/ from src/', ->
  buildCanvas()
  
task 'server', 'Watch src for changes', ->
  
  # Get package.json
  pkg = require('./package.json')
  name = pkg['name'].toLowerCase()
    
  # Specify the name of the WebGL library
  output = "lib/#{name}-gl.js"
  
  order = [
    'src/WebFITS.coffee',
    'src/BaseApi.coffee',
    'src/Shaders.coffee',
    'src/ColorMaps.coffee',
    'src/WebGL.coffee'
  ]
  
  # Set the flags for coffeescript compilation
  flags = ['-w', '-j', output, '-c'].concat order
  
  # Compile to JavaScript
  coffee_webgl = spawn 'coffee', flags
    
  # Specify the name of the Canvas library
  output = "lib/#{name}-canvas.js"
  
  order = [
    'src/WebFITS.coffee',
    'src/BaseApi.coffee',
    'src/Canvas'
  ]
  
  # Set the flags for coffeescript compilation
  flags = ['-w', '-j', output, '-c'].concat order
  
  # Compile to JavaScript
  coffee_canvas = spawn 'coffee', flags
  
  # Start local server
  server = spawn 'http-server'
  
  for p in [coffee_webgl, coffee_canvas, server]
    p.stderr.on 'data', (data) ->
      process.stderr.write data.toString()
    p.stdout.on 'data', (data) ->
      print data.toString()
  
  