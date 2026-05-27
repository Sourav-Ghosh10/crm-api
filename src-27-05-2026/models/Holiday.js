const mongoose = require('mongoose');
const { Schema } = mongoose;

const holidaySchema = new Schema({
  name: { type: String, required: true, trim: true },
  date: { type: Date, required: true, unique: true },
  description: { type: String, trim: true, default: '' },
  isRecurring: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

holidaySchema.pre('save', async function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Holiday', holidaySchema);
