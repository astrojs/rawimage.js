
import base64

import numpy as np
import matplotlib.pyplot as plt
import Image


def grayscale():
  values = []
  
  for i in xrange(256):
    print "%d, %d, %d," % (i, i, i)


def createColorMaps():
  
  # Get list of all color maps
  cmaps = sorted(m for m in plt.cm.datad if m.endswith("_r"))
  
  # Create a sequence of values for 8bit colors
  x = np.vstack( np.arange(0, 256, 1) )
  colors = []
  
  # Generate the colormaps
  for index, c in enumerate(cmaps):
    print "%s: %d" % (c.replace('_r', ''), len(cmaps) - index)
    # print len(cmaps) - index, c
    
    cmap = plt.get_cmap(c)
    values = np.round( 255 * cmap(x) ).astype('uint8')
    colors.append(values)
  
  # Stack and orient colormaps horizontally
  arr = colors.pop(0)
  for item in colors:
    arr = np.hstack((arr, item))
  arr = np.rot90(arr)
  
  # Save out to PNG
  im = Image.fromarray(arr)
  im.save('colormaps.png')
  
  # Read bytes from image
  f = open('colormaps.png', 'rb')
  data = f.read()
  
  # Encode as base64 for use in library
  print "\n"
  print base64.b64encode(data)
  

# Generate RGB values from matplotlibs colormaps
def main():
  cmaps = sorted(m for m in plt.cm.datad if not m.endswith("_r"))
  
  for c in cmaps:
    s = "%s: [\n" % c
    cmap = plt.get_cmap(c)
  
    values = []
    for i in xrange(255):
      c = cmap(i)
      for j in xrange(3):
        values.append( c[j] )
    values = np.round( 255 * np.array(values) )
  
    for i in xrange(255):
      r = values[i * 3]
      g = values[i * 3 + 1]
      b = values[i * 3 + 2]
      s += "  %d, %d, %d,\n" % (r, g, b)
    
    s = s[0:-2] + "\n]"
    print s

if __name__ == '__main__':
  createColorMaps()