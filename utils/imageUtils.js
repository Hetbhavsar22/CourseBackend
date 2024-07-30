const fs = require('fs');
const path = require('path');

/**
 * Saves a base64 encoded image to the specified file path.
 * @param {string} base64Str - The base64 encoded image string.
 * @param {string} filePath - The path where the image should be saved.
 */
function saveBase64Image(base64Str, filePath) {
  const base64Data = base64Str.replace(/^data:image\/jpeg;base64,/, "");
  fs.writeFileSync(filePath, base64Data, 'base64');
}

module.exports = { saveBase64Image };
