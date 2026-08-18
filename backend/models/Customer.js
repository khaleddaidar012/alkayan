const mongoose = require('mongoose');
const { normalizePhone, detectCountryFromPhone } = require('../utils/countryDetection');

const paymentRecordSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, default: Date.now },
  time: { type: String, default: '' },
  method: { type: String, enum: ['cash', 'instapay', 'bankTransfer', 'vodafoneCash', 'other'], default: 'cash' },
  referenceNumber: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { _id: true });

const paymentSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['notPaid', 'partiallyPaid', 'fullyPaid'],
    default: 'notPaid'
  },
  programPrice: { type: Number, default: 0, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  finalPrice: { type: Number, default: 0, min: 0 },
  initialPayment: { type: Number, default: 0, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  remainingAmount: { type: Number, default: 0, min: 0 },
  nextPaymentDate: { type: Date, default: null },
  paymentMethod: { type: String, enum: ['cash', 'instapay', 'bankTransfer', 'vodafoneCash', 'other'], default: 'cash' },
  history: [paymentRecordSchema]
}, { _id: false });

const customerSchema = new mongoose.Schema({
  name: { type: String, trim: true, default: '' },
  name_ar: { type: String, trim: true, default: '', maxlength: 100 },
  name_en: { type: String, trim: true, default: '', maxlength: 100 },
  phone: { type: String, required: [true, 'Phone number is required'], trim: true },
  whatsapp: { type: String, trim: true, default: '' },
  whatsapp_number: { type: String, trim: true, default: '' },
  country: {
    type: String,
    enum: ['egypt', 'saudi_arabia', 'oman', 'libya', 'other'],
    default: 'other'
  },
  email: { type: String, lowercase: true, trim: true, default: '' },
  address: { type: String, trim: true, default: '' },
  program: { type: String, trim: true, default: '' },
  program_name: { type: String, trim: true, default: '' },
  source: {
    type: String,
    enum: ['manual', 'whatsapp_webhook'],
    default: 'manual'
  },
  assignedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  registrationDate: { type: Date, default: Date.now },
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null },
  registrationSource: { type: String, enum: ['campaign', 'direct', 'referral', 'social', 'other'], default: 'direct' },
  programRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  status: { type: String, enum: ['subscribed', 'potential', 'thinking', 'noResponse', 'rejected'], default: 'potential' },
  communication_count: { type: Number, default: 0, min: 0 },
  last_communication_date: { type: Date, default: null },
  status_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerStatus', default: null },
  payment: {
    type: paymentSchema,
    default: () => ({
      status: 'notPaid', programPrice: 0, discount: 0, finalPrice: 0,
      initialPayment: 0, paidAmount: 0, remainingAmount: 0,
      nextPaymentDate: null, paymentMethod: 'cash', history: []
    })
  },
  rejectionReason: { type: String, default: '' },
  rejectionCustomReason: { type: String, default: '' },
  notes: { type: String, default: '' },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

customerSchema.index(
  { whatsapp_number: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false, whatsapp_number: { $type: 'string' } } }
);
customerSchema.index({ phone: 1 });
customerSchema.index({ country: 1 });
customerSchema.index({ isDeleted: 1 });

customerSchema.pre('save', function (next) {
  const derivedNumber = this.whatsapp_number || this.whatsapp || this.phone || '';
  if (!this.whatsapp_number) {
    this.whatsapp_number = normalizePhone(derivedNumber);
  } else {
    this.whatsapp_number = normalizePhone(this.whatsapp_number);
  }
  if (!this.name) {
    this.name = this.name_ar || this.name_en || this.whatsapp_number || 'Unnamed';
  }
  if (!this.country) {
    this.country = detectCountryFromPhone(this.whatsapp_number || this.phone);
  }
  next();
});

module.exports = mongoose.model('Customer', customerSchema);