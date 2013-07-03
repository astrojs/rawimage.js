import base64

import numpy as np
import matplotlib.pyplot as plt
import Image


def createColorMaps():
  
  # Get list of all color maps
  cmaps = sorted(m for m in plt.cm.datad if m.endswith("_r"))
  
  # Create a sequence of values for 8bit colors
  x = np.vstack( np.arange(0, 256, 1) )
  colors = []
  
  # Generate the colormaps
  for index, c in enumerate(cmaps):
    print "%s: %d" % (c.replace('_r', ''), len(cmaps) - index)
    
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


if __name__ == '__main__':
  createColorMaps()