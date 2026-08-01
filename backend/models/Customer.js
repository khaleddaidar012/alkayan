const mongoose = require('mongoose');

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
  name: { type: String, required: [true, 'Name is required'], trim: true },
  phone: { type: String, required: [true, 'Phone number is required'], trim: true },
  whatsapp: { type: String, trim: true, default: '' },
  email: { type: String, lowercase: true, trim: true, default: '' },
  address: { type: String, trim: true, default: '' },
  program: { type: String, trim: true, default: '' },
  assignedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  registrationDate: { type: Date, default: Date.now },
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null },
  registrationSource: { type: String, enum: ['campaign', 'direct', 'referral', 'social', 'other'], default: 'direct' },
  programRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  status: { type: String, enum: ['subscribed', 'potential', 'thinking', 'noResponse', 'rejected'], default: 'potential' },
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
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
