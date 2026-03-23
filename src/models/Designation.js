const mongoose = require('mongoose');
const { Schema } = mongoose;

const designationSchema = new Schema({
  title: { type: String, required: true, unique: true },
  description: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

designationSchema.pre('save', async function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Designation', designationSchema);
