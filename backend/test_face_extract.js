const fs = require('fs');
const { loadFaceModels } = require('./src/services/ai/faceModelLoader');
const { extractDescriptor } = require('./src/services/ai/face.service');

(async () => {
  try {
    console.log("Loading models...");
    await loadFaceModels();
    console.log("Models loaded. Mocking image...");
    // create a fake valid 1x1 jpeg buffer to prevent crash in canvas if invalid
    // 1x1 white jpeg
    const imgBuffer = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
    
    console.log("Extracting descriptor...");
    await extractDescriptor(imgBuffer);
    console.log("Success!");
  } catch (err) {
    console.error("Caught error:", err);
  }
})();
