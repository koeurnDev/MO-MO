const cloudinary = require('../config/cloudinary');

const uploadService = {
  uploadImage: async (file) => {
    if (!file) throw new Error('No file provided');
    
    // Convert buffer to base64 for Cloudinary if using memory storage
    const b64 = Buffer.from(file.buffer).toString('base64');
    const dataURI = 'data:' + file.mimetype + ';base64,' + b64;
    
    const res = await cloudinary.uploader.upload(dataURI, {
      folder: 'products'
    });
    
    return res.secure_url;
  }
};

module.exports = uploadService;
