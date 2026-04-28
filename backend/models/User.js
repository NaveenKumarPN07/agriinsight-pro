const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['user', 'admin', 'analyst'], default: 'user' },
  avatar: { type: String, default: null },
  organization: { type: String, default: '' },
  preferences: {
    defaultCrop: { type: String, default: 'all' },
    defaultState: { type: String, default: 'all' },
    defaultDateRange: { type: Number, default: 5 },
    emailAlerts: { type: Boolean, default: true },
    theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
  },
  lastLogin: { type: Date },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
