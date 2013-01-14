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
  coffee.on 'exit', (code) ->
    callback?() if code is 0

buildWebGl = ->
  # Get parameters from package.json
  pkg = require('./package.json')
  
  # Specify the name of the library
  output = "lib/#{pkg['name'].toLowerCase()}-gl-#{pkg['version']}.js"
  
  order = [
    'src/WebFITS.coffee',
    'src/BaseApi.coffee',
    'src/Shaders.coffee',
    'src/WebGL.coffee'
  ]
  
  build(order, output)

buildCanvas = ->
  
  # Get parameters from package.json
  pkg = require('./package.json')
  
  # Specify the name of the library
  output = "lib/#{pkg['name'].toLowerCase()}-canvas-#{pkg['version']}.js"
  
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
  
task 'watch', 'Watch src for changes', ->
  # Get parameters from package.json
  pkg = require('./package.json')
  
  # Specify the name of the WebGL library
  output = "lib/#{pkg['name'].toLowerCase()}-gl-#{pkg['version']}.js"
  
  order = [
    'src/WebFITS.coffee',
    'src/BaseApi.coffee',
    'src/Shaders.coffee',
    'src/WebGL.coffee'
  ]
  
  # Set the flags for coffeescript compilation
  flags = ['-w', '-j', output, '-c'].concat order
  
  # Compile to JavaScript
  coffee = spawn 'coffee', flags
  coffee.stderr.on 'data', (data) ->
    process.stderr.write data.toString()
  coffee.stdout.on 'data', (data) ->
    print data.toString()
  coffee.on 'exit', (code) ->
    callback?() if code is 0
    
  # Specify the name of the Canvas library
  output = "lib/#{pkg['name'].toLowerCase()}-canvas-#{pkg['version']}.js"
  
  order = [
    'src/WebFITS.coffee',
    'src/BaseApi.coffee',
    'src/Canvas'
  ]
  
  # Set the flags for coffeescript compilation
  flags = ['-w', '-j', output, '-c'].concat order
  
  # Compile to JavaScript
  coffee = spawn 'coffee', flags
  coffee.stderr.on 'data', (data) ->
    process.stderr.write data.toString()
  coffee.stdout.on 'data', (data) ->
    print data.toString()
  coffee.on 'exit', (code) ->
    callback?() if code is 0