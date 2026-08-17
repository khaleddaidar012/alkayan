const mongoose = require('mongoose');

const programPriceSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  egypt_price: { type: Number, default: 0, min: 0 },
  saudi_arabia_price: { type: Number, default: 0, min: 0 },
  oman_price: { type: Number, default: 0, min: 0 },
  libya_price: { type: Number, default: 0, min: 0 },
  usd_fallback_price: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

programPriceSchema.statics.getSingleton = async function () {
  const doc = await this.findOne({ key: 'default' });
  if (doc) return doc;
  return this.create({ key: 'default' });
};

programPriceSchema.methods.toPricingObject = function () {
  return {
    egypt: { amount: this.egypt_price || 0, currency: 'EGP' },
    saudi_arabia: { amount: this.saudi_arabia_price || 0, currency: 'SAR' },
    oman: { amount: this.oman_price || 0, currency: 'OMR' },
    libya: { amount: this.libya_price || 0, currency: 'LYD' },
    usd_fallback: { amount: this.usd_fallback_price || 0, currency: 'USD' }
  };
};

programPriceSchema.methods.toFlatObject = function () {
  return {
    egypt_price: this.egypt_price || 0,
    saudi_arabia_price: this.saudi_arabia_price || 0,
    oman_price: this.oman_price || 0,
    libya_price: this.libya_price || 0,
    usd_fallback_price: this.usd_fallback_price || 0
  };
};

module.exports = mongoose.model('ProgramPrice', programPriceSchema);