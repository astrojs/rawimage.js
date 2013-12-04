
// Downsample by a given factor, typically done prior to uploading texture
// to the GPU.
rawimage.prototype.downsample = function(arr, width, height, factor) {
  var i, j, ii, jj, newWidth, newHeight, sum, N;
  
  newWidth = parseInt((width + factor - 1) / factor);
  newHeight = parseInt((height + factor - 1) / factor);
  
  // Be memory greedy for now.
  newArr = new arr.constructor(newWidth * newHeight);
  
  // Downsample by averaging factor x factor blocks, placing the result in the bottom left of the block.
  for (j = 0; j < newHeight; j += 1) {
    for (i = 0; i < newWidth; i += 1) {
      sum = 0, N = 0;
      
      for (jj = 0; jj < factor; jj += 1) {
        if (j * factor + jj >= height) break;
        
        for (ii = 0; ii < factor; ii += 1) {
          if (i * factor + ii >= width) break;
          
          sum += arr[(j * factor + jj) * width + (i * factor + ii)];
          N += 1;
        }
      }
      
      newArr[j * newWidth + i] = sum / N;
    }
  }
  
  return {
    arr: newArr,
    width: newWidth,
    height: newHeight
  };
};