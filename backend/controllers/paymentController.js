const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const PaymentMethod = require('../models/PaymentMethod');
const { validationResult } = require('express-validator');
const { deleteFile } = require('../services/fileUpload');
const { currencyForCountry } = require('../utils/pricing');
const { calculateDebt } = require('../utils/debt');

exports.getPayments = async (req, res) => {
  try {
    const customerId = req.params.customerId;
    const { page = 1, limit = 50, direction } = req.query;
    const filter = { customer: customerId };
    if (direction && ['in', 'out'].includes(direction)) filter.direction = direction;
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
    const total = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .populate('method', 'name country')
      .populate('created_by', 'name')
      .sort({ created_at: -1 })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize);
    res.json({
      payments,
      count: payments.length,
      total,
      page: currentPage,
      pages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPaymentSummary = async (req, res) => {
  try {
    const summary = await Payment.getSummary(req.params.customerId);
    res.json({ summary });
  } catch (error) {
    console.error('Get payment summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createPayment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const customer = await Customer.findOne({ _id: req.params.customerId, isDeleted: { $ne: true } });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const { amount, currency, direction, method_id, notes, method } = req.body;
    const dir = direction || 'in';

    if (currency) {
      const expected = currencyForCountry(customer.country || 'other');
      if (currency !== expected && currency !== 'USD') {
        return res.status(400).json({ message: `Currency mismatch: expected ${expected} for this customer's country` });
      }
    }

    const methodDoc = method_id ? await PaymentMethod.findById(method_id) : null;
    if (method_id && !methodDoc) return res.status(400).json({ message: 'Invalid payment method' });

    const payment = await Payment.create({
      customer: customer._id,
      amount,
      currency: (currency || currencyForCountry(customer.country || 'other')).toUpperCase(),
      direction: dir,
      method: methodDoc ? methodDoc._id : null,
      methodName: methodDoc ? methodDoc.name : (method || 'cash'),
      receipt_url: req.file ? `/uploads/${req.file.filename}` : '',
      notes: notes || '',
      created_by: req.user._id
    });

    if (dir === 'in') {
      customer.payment = customer.payment || {};
      customer.payment.history = customer.payment.history || [];
      const rawMethod = String(method || methodDoc?.name || 'cash').toLowerCase().replace(/[\s_]/g, '');
      const validMethods = ['cash', 'instapay', 'banktransfer', 'vodafonecash', 'other'];
      const embeddedMethod = validMethods.includes(rawMethod) ? (rawMethod === 'banktransfer' ? 'bankTransfer' : rawMethod === 'vodafonecash' ? 'vodafoneCash' : rawMethod) : 'other';
      customer.payment.history.push({
        amount,
        method: embeddedMethod,
        referenceNumber: notes || '',
        notes: notes || '',
        date: new Date()
      });
      const newPaid = (Number(customer.payment.paidAmount) || 0) + Number(amount);
      const fp = customer.payment.finalPrice || 0;
      customer.payment.paidAmount = newPaid;
      customer.payment.remainingAmount = Math.max(0, fp - newPaid);
      customer.payment.status = fp > 0 && newPaid >= fp ? 'fullyPaid' : newPaid > 0 ? 'partiallyPaid' : 'notPaid';
      await customer.save();
    }

    const populated = await Payment.findById(payment._id).populate('method', 'name country').populate('created_by', 'name');
    res.status(201).json({ payment: populated, customer });
  } catch (error) {
    console.error('Create payment error:', error);
    if (req.file) deleteFile(`/uploads/${req.file.filename}`);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    const customerId = payment.customer;
    if (payment.receipt_url) deleteFile(payment.receipt_url);
    await payment.deleteOne();

    if (String(payment.direction) === 'in') {
      const customer = await Customer.findOne({ _id: customerId, isDeleted: { $ne: true } });
      if (customer) {
        const remaining = await Payment.find({ customer: customerId, direction: 'in' }).sort({ created_at: 1 });
        customer.payment = customer.payment || {};
        customer.payment.history = remaining.map((p) => {
          const rawMethod = String(p.methodName || 'cash').toLowerCase().replace(/[\s_]/g, '');
          const validMethods = ['cash', 'instapay', 'banktransfer', 'vodafonecash', 'other'];
          const embeddedMethod = validMethods.includes(rawMethod) ? (rawMethod === 'banktransfer' ? 'bankTransfer' : rawMethod === 'vodafonecash' ? 'vodafoneCash' : rawMethod) : 'other';
          return {
            amount: p.amount,
            method: embeddedMethod,
            referenceNumber: p.notes || '',
            notes: p.notes || '',
            date: p.created_at
          };
        });
        const paid = customer.payment.history.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        const fp = customer.payment.finalPrice || 0;
        customer.payment.paidAmount = paid;
        customer.payment.remainingAmount = Math.max(0, fp - paid);
        customer.payment.status = fp > 0 && paid >= fp ? 'fullyPaid' : paid > 0 ? 'partiallyPaid' : 'notPaid';
        await customer.save();
      }
    }

    res.json({ message: 'Payment deleted', payment });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCustomerDebt = async (req, res) => {
  try {
    const payments = await Payment.find({ customer: req.params.customerId }).select('amount direction');
    const debt = calculateDebt(payments);
    res.json({ debt });
  } catch (error) {
    console.error('Get customer debt error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};