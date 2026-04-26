const mongoose = require('mongoose');
const Product = require('./src/models/product.model');

async function check() {
  try {
    await mongoose.connect('mongodb+srv://thanhtung1:thanhtung1@cluster0.tk0dmwl.mongodb.net/Project_Pharmacy');
    
    const count = await Product.countDocuments();
    console.log('Total Products:', count);
    
    const active = await Product.countDocuments({ isActive: { $ne: false } });
    console.log('Active Products:', active);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
