const Customer = require('../models/Customer');
const Campaign = require('../models/Campaign');
const Course = require('../models/Course');
const Payment = require('../models/Payment');
const { validationResult } = require('express-validator');
const { normalizePhone, detectCountryFromPhone, COUNTRY_KEYS } = require('../utils/countryDetection');
const { calculateDebt } = require('../utils/debt');

exports.getCustomers = async (req, res) => {
  try {
    const { status, program, employee, campaign, dateFrom, dateTo, search, country, page, limit } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (status) filter.status = status;
    if (program) filter.program = { $regex: program, $options: 'i' };
    if (employee) filter.assignedEmployee = employee;
    if (campaign) filter.campaign = campaign;
    if (country) filter.country = country;
    if (dateFrom || dateTo) {
      filter.registrationDate = {};
      if (dateFrom) filter.registrationDate.$gte = new Date(dateFrom);
      if (dateTo) filter.registrationDate.$lte = new Date(dateTo);
    }
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      filter.$or = [
        { name: searchRegex },
        { name_ar: searchRegex },
        { name_en: searchRegex },
        { phone: searchRegex },
        { whatsapp: searchRegex },
        { whatsapp_number: searchRegex },
        { email: searchRegex }
      ];
    }

    const total = await Customer.countDocuments(filter);

    let query = Customer.find(filter)
      .populate('assignedEmployee', 'name email role')
      .populate('campaign', 'name')
      .populate('programRef', 'name')
      .populate('status_id', 'name color description is_system')
      .sort({ createdAt: -1 });

    const hasPagination = page !== undefined || limit !== undefined;
    let currentPage = 1;
    let pageSize = null;
    if (hasPagination) {
      currentPage = Math.max(1, parseInt(page, 10) || 1);
      pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
      query = query.skip((currentPage - 1) * pageSize).limit(pageSize);
    }

    const customers = await query;

    const ids = customers.map(c => c._id);
    const ledger = await Payment.aggregate([
      { $match: { customer: { $in: ids } } },
      { $group: {
        _id: '$customer',
        total_in: { $sum: { $cond: [{ $eq: ['$direction', 'in'] }, '$amount', 0] } },
        total_out: { $sum: { $cond: [{ $eq: ['$direction', 'out'] }, '$amount', 0] } }
      } }
    ]);
    const balanceMap = {};
    for (const row of ledger) {
      balanceMap[String(row._id)] = calculateDebt([{ amount: row.total_in, direction: 'in' }, { amount: row.total_out, direction: 'out' }]).balance;
    }
    const serialized = customers.map(c => {
      const obj = c.toObject();
      const bal = balanceMap[String(c._id)];
      obj.debt_balance = bal === undefined ? 0 : Math.round(bal * 100) / 100;
      return obj;
    });

    res.json({
      customers: serialized,
      count: serialized.length,
      total,
      page: hasPagination ? currentPage : undefined,
      pages: hasPagination ? Math.ceil(total / pageSize) : undefined
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
      .populate('assignedEmployee', 'name email role')
      .populate('campaign', 'name')
      .populate('programRef', 'name')
      .populate('enrolledCourses', 'title')
      .populate('status_id', 'name color description is_system');
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    const ledger = await Payment.aggregate([
      { $match: { customer: customer._id } },
      { $group: {
        _id: '$customer',
        total_in: { $sum: { $cond: [{ $eq: ['$direction', 'in'] }, '$amount', 0] } },
        total_out: { $sum: { $cond: [{ $eq: ['$direction', 'out'] }, '$amount', 0] } }
      } }
    ]);
    const obj = customer.toObject();
    const bal = ledger.length
      ? calculateDebt([{ amount: ledger[0].total_in, direction: 'in' }, { amount: ledger[0].total_out, direction: 'out' }]).balance
      : 0;
    obj.debt_balance = Math.round(bal * 100) / 100;
    res.json({ customer: obj });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    const { name, phone, whatsapp, whatsapp_number, country, name_ar, name_en, email, address, program, programRef, campaign, assignedEmployee, registrationDate, status, notes, registrationSource, payment } = req.body;

    const normalizedNumber = normalizePhone(whatsapp_number || whatsapp || phone || '');
    if (!normalizedNumber) {
      return res.status(400).json({ message: 'WhatsApp number is required' });
    }

    const existing = await Customer.findOne({ whatsapp_number: normalizedNumber, isDeleted: { $ne: true } });
    if (existing) {
      return res.status(409).json({ message: 'A customer with this WhatsApp number already exists', customer: existing });
    }

    const detectedCountry = country && COUNTRY_KEYS.includes(country) ? country : detectCountryFromPhone(normalizedNumber);
    const customerName = name || name_ar || name_en || normalizedNumber;

    const customerData = {
      name: customerName,
      name_ar: name_ar || '',
      name_en: name_en || '',
      phone: phone || whatsapp || whatsapp_number || normalizedNumber,
      whatsapp: whatsapp || phone || whatsapp_number || normalizedNumber,
      whatsapp_number: normalizedNumber,
      country: detectedCountry,
      email, address, program, programRef, campaign, assignedEmployee, registrationDate, status, notes, registrationSource
    };
    if (status === 'subscribed') {
      let total = payment?.totalAmount !== undefined && payment?.totalAmount !== null ? payment.totalAmount : undefined;
      let paid = payment?.paidAmount || 0;
      let discount = payment?.discount || 0;
      let programPrice = payment?.programPrice;
      const initialPayment = payment?.initialPayment || 0;
      const payMethod = payment?.method || 'cash';
      const payNotes = payment?.notes || 'Initial payment';
      const payReference = payment?.referenceNumber || '';

      if (programRef) {
        const program = await Course.findById(programRef);
        if (program) {
          programPrice = program.price;
          if (total === undefined || total === null) {
            total = Math.max(0, program.price - discount);
          }
        }
      }
      if (total === undefined || total === null) total = 0;

      const payStatus = total > 0 && paid >= total ? 'fullyPaid' : paid > 0 ? 'partiallyPaid' : 'notPaid';
      customerData.payment = {
        status: payStatus,
        programPrice: programPrice || 0,
        discount,
        finalPrice: total,
        initialPayment,
        paidAmount: paid,
        remainingAmount: Math.max(0, total - paid),
        nextPaymentDate: payment?.nextPaymentDate || null,
        paymentMethod: payMethod,
        history: paid > 0 ? [{ amount: paid, date: new Date(), method: payMethod, referenceNumber: payReference, notes: payNotes }] : []
      };
    }
    const customer = await Customer.create(customerData);
    if (campaign) {
      await Campaign.findByIdAndUpdate(campaign, { $push: { customers: customer._id } });
    }
    const populated = await Customer.findById(customer._id).populate('assignedEmployee', 'name email role').populate('campaign', 'name').populate('programRef', 'name').populate('status_id', 'name color description is_system');
    res.status(201).json({ customer: populated });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
    const allowedFields = ['name', 'name_ar', 'name_en', 'phone', 'whatsapp', 'whatsapp_number', 'country', 'email', 'address', 'program', 'program_name', 'source', 'programRef', 'campaign', 'assignedEmployee', 'registrationDate', 'status', 'notes', 'registrationSource'];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }
    if (updateData.whatsapp_number !== undefined) {
      updateData.whatsapp_number = normalizePhone(updateData.whatsapp_number);
    }
    if (updateData.country === undefined) {
      const existing = await Customer.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).select('country whatsapp_number whatsapp phone');
      if (existing && !existing.country) {
        updateData.country = detectCountryFromPhone(updateData.whatsapp_number || existing.whatsapp_number || existing.whatsapp || existing.phone);
      }
    }
    if (req.body.payment || req.body.programRef !== undefined) {
      const existing = await Customer.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).select('payment programRef');
      const exPay = existing?.payment || {};
      const p = req.body.payment || {};
      const programChanged = req.body.programRef !== undefined;
      const explicitPayment = req.body.payment !== undefined;
      let programPrice = p.programPrice !== undefined ? p.programPrice : (exPay.programPrice || 0);
      let program = null;

      if (programChanged && !explicitPayment) {
        program = req.body.programRef ? await Course.findById(req.body.programRef) : null;
        if (program) programPrice = program.price;
      }

      const discount = p.discount !== undefined ? p.discount : (exPay.discount || 0);
      const hasPaymentHistory = Array.isArray(exPay.history) && exPay.history.length > 0 && (exPay.paidAmount || 0) > 0;
      let total;
      if (p.totalAmount !== undefined && p.totalAmount !== null) {
        total = p.totalAmount;
      } else if (p.finalPrice !== undefined && p.finalPrice !== null) {
        total = p.finalPrice;
      } else if (programChanged && !explicitPayment) {
        total = program ? Math.max(0, programPrice - discount) : exPay.finalPrice;
      } else {
        total = exPay.finalPrice || 0;
      }
      if (programChanged && !explicitPayment && hasPaymentHistory) {
        total = exPay.finalPrice || 0;
      }
      const paid = p.paidAmount !== undefined && p.paidAmount !== null ? p.paidAmount : (exPay.paidAmount || 0);
      const history = Array.isArray(p.history) ? p.history : (exPay.history || []);
      const payStatus = total > 0 && paid >= total ? 'fullyPaid' : paid > 0 ? 'partiallyPaid' : 'notPaid';
      updateData.payment = {
        status: payStatus,
        programPrice,
        discount,
        finalPrice: total,
        initialPayment: p.initialPayment !== undefined ? p.initialPayment : (exPay.initialPayment || 0),
        paidAmount: paid,
        remainingAmount: Math.max(0, total - paid),
        nextPaymentDate: p.nextPaymentDate !== undefined ? p.nextPaymentDate : (exPay.nextPaymentDate || null),
        paymentMethod: p.paymentMethod !== undefined ? p.paymentMethod : (exPay.paymentMethod || 'cash'),
        history
      };
    }
    const customer = await Customer.findOneAndUpdate({ _id: req.params.id, isDeleted: { $ne: true } }, { $set: updateData }, { new: true, runValidators: true })
      .populate('assignedEmployee', 'name email role').populate('campaign', 'name').populate('programRef', 'name').populate('status_id', 'name color description is_system');
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ customer });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    );
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    if (customer.campaign) {
      await Campaign.findByIdAndUpdate(customer.campaign, { $pull: { customers: customer._id } });
    }
    res.json({ message: 'Customer deleted successfully', customer });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateCustomerStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'Status is required' });
    const validStatuses = ['subscribed', 'potential', 'thinking', 'noResponse', 'rejected'];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const updateData = { status };
    if (status === 'subscribed') {
      const { payment } = req.body;
      if (payment) {
        const existing = await Customer.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).select('payment');
        const exPay = existing?.payment || {};
        const total = payment.totalAmount !== undefined && payment.totalAmount !== null
          ? payment.totalAmount
          : (payment.finalPrice !== undefined && payment.finalPrice !== null ? payment.finalPrice : (exPay.finalPrice || 0));
        const paid = payment.paidAmount !== undefined && payment.paidAmount !== null
          ? payment.paidAmount
          : (exPay.paidAmount || 0);
        const history = Array.isArray(payment.history) ? payment.history : (exPay.history || []);
        const payStatus = total > 0 && paid >= total ? 'fullyPaid' : paid > 0 ? 'partiallyPaid' : 'notPaid';
        updateData.payment = {
          status: payStatus,
          programPrice: payment.programPrice !== undefined ? payment.programPrice : (exPay.programPrice || 0),
          discount: payment.discount !== undefined ? payment.discount : (exPay.discount || 0),
          finalPrice: total,
          initialPayment: payment.initialPayment !== undefined ? payment.initialPayment : (exPay.initialPayment || 0),
          paidAmount: paid,
          remainingAmount: Math.max(0, total - paid),
          nextPaymentDate: payment.nextPaymentDate !== undefined ? payment.nextPaymentDate : (exPay.nextPaymentDate || null),
          paymentMethod: payment.paymentMethod !== undefined ? payment.paymentMethod : (exPay.paymentMethod || 'cash'),
          history
        };
      }
      updateData.rejectionReason = ''; updateData.rejectionCustomReason = '';
    }
    if (status === 'rejected') {
      updateData.rejectionReason = req.body.rejectionReason || '';
      updateData.rejectionCustomReason = req.body.rejectionCustomReason || '';
    }
    if (['potential', 'thinking', 'noResponse'].includes(status)) {
      updateData.rejectionReason = ''; updateData.rejectionCustomReason = '';
    }
    const customer = await Customer.findOneAndUpdate({ _id: req.params.id, isDeleted: { $ne: true } }, { $set: updateData }, { new: true, runValidators: true })
      .populate('assignedEmployee', 'name email role');
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ customer });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addPayment = async (req, res) => {
  try {
    const { amount, method, referenceNumber, notes, date } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Valid amount is required' });
    const customer = await Customer.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    const now = new Date();
    const record = { amount, date: date ? new Date(date) : now, time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }), method: method || 'cash', referenceNumber: referenceNumber || '', notes: notes || '' };
    customer.payment.history.push(record);
    const newPaid = (customer.payment.paidAmount || 0) + amount;
    const fp = customer.payment.finalPrice || 0;
    customer.payment.paidAmount = newPaid;
    customer.payment.remainingAmount = Math.max(0, fp - newPaid);
    customer.payment.status = newPaid >= fp ? 'fullyPaid' : 'partiallyPaid';
    if (customer.status !== 'subscribed') {
      customer.status = 'subscribed';
    }
    await customer.save();
    const populated = await Customer.findById(customer._id).populate('assignedEmployee', 'name email role').populate('campaign', 'name').populate('programRef', 'name').populate('status_id', 'name color description is_system');
    const added = customer.payment.history[customer.payment.history.length - 1];
    res.json({ customer: populated, payment: added });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const { amount, method, referenceNumber, notes, date } = req.body;
    const customer = await Customer.findOne({ _id: req.params.customerId, isDeleted: { $ne: true } });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    const history = customer.payment.history || [];
    const record = history.id(req.params.paymentId);
    if (!record) return res.status(404).json({ message: 'Payment record not found' });
    if (amount !== undefined) {
      const num = Number(amount);
      if (isNaN(num) || num <= 0) return res.status(400).json({ message: 'Valid amount is required' });
      record.amount = num;
    }
    if (method !== undefined) record.method = method || 'cash';
    if (referenceNumber !== undefined) record.referenceNumber = referenceNumber || '';
    if (notes !== undefined) record.notes = notes || '';
    if (date !== undefined && date) record.date = new Date(date);
    const paid = history.reduce((sum, r) => sum + (r.amount || 0), 0);
    const fp = customer.payment.finalPrice || 0;
    customer.payment.paidAmount = paid;
    customer.payment.remainingAmount = Math.max(0, fp - paid);
    customer.payment.status = fp > 0 && paid >= fp ? 'fullyPaid' : paid > 0 ? 'partiallyPaid' : 'notPaid';
    await customer.save();
    const populated = await Customer.findById(customer._id).populate('assignedEmployee', 'name email role').populate('campaign', 'name').populate('programRef', 'name').populate('status_id', 'name color description is_system');
    res.json({ customer: populated, payment: record });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.customerId, isDeleted: { $ne: true } });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    const history = customer.payment.history || [];
    const record = history.id(req.params.paymentId);
    if (!record) return res.status(404).json({ message: 'Payment record not found' });
    record.deleteOne();
    const paid = history.reduce((sum, r) => sum + (r.amount || 0), 0);
    const fp = customer.payment.finalPrice || 0;
    customer.payment.paidAmount = paid;
    customer.payment.remainingAmount = Math.max(0, fp - paid);
    customer.payment.status = fp > 0 && paid >= fp ? 'fullyPaid' : paid > 0 ? 'partiallyPaid' : 'notPaid';
    await customer.save();
    const populated = await Customer.findById(customer._id).populate('assignedEmployee', 'name email role').populate('campaign', 'name').populate('programRef', 'name').populate('status_id', 'name color description is_system');
    res.json({ customer: populated });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
