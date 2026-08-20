const Course = require('../models/Course');
const Campaign = require('../models/Campaign');
const Customer = require('../models/Customer');
const { validationResult } = require('express-validator');

exports.getPrograms = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }

    const programs = await Course.find(filter).sort({ createdAt: -1 });

    const enriched = await Promise.all(programs.map(async (p) => {
      const activeCustomers = await Customer.countDocuments({ program: p.name, status: 'subscribed', isDeleted: { $ne: true } });
      const totalEnrollments = await Customer.countDocuments({ program: p.name, isDeleted: { $ne: true } });
      const activeCampaigns = await Campaign.countDocuments({ program: p._id, status: 'active' });
      const revenue = await Customer.aggregate([
        { $match: { program: p.name, status: 'subscribed', isDeleted: { $ne: true } } },
        { $group: { _id: null, expectedRevenue: { $sum: '$payment.totalPrice' }, collectedRevenue: { $sum: '$payment.paidAmount' } } }
      ]);
      return {
        ...p.toObject(),
        activeCustomers,
        totalEnrollments,
        activeCampaigns,
        expectedRevenue: revenue[0]?.expectedRevenue || 0,
        collectedRevenue: revenue[0]?.collectedRevenue || 0
      };
    }));

    res.json({ programs: enriched, count: enriched.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProgramsOverview = async (req, res) => {
  try {
    const [programCount, activeProgramCount, customerAgg, campaignAgg, revenueAgg] = await Promise.all([
      Course.countDocuments(),
      Course.countDocuments({ status: 'active' }),
      Customer.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Campaign.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Customer.aggregate([
        { $match: { status: 'subscribed' } },
        { $group: { _id: null, expectedRevenue: { $sum: '$payment.totalPrice' }, collectedRevenue: { $sum: '$payment.paidAmount' } } }
      ])
    ]);

    const customerMap = {};
    customerAgg.forEach(s => { customerMap[s._id] = s.count; });
    const campaignMap = {};
    campaignAgg.forEach(s => { campaignMap[s._id] = s.count; });

    const stats = {
      totalPrograms: programCount,
      activePrograms: activeProgramCount,
      totalRegistered: customerAgg.reduce((sum, s) => sum + s.count, 0),
      activeCustomers: customerMap['subscribed'] || 0,
      potentialCustomers: customerMap['potential'] || 0,
      totalCampaigns: campaignAgg.reduce((sum, s) => sum + s.count, 0),
      activeCampaigns: campaignMap['active'] || 0,
      completedCampaigns: campaignMap['completed'] || 0,
      expectedRevenue: revenueAgg[0]?.expectedRevenue || 0,
      collectedRevenue: revenueAgg[0]?.collectedRevenue || 0,
      updatedAt: new Date().toISOString()
    };

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProgram = async (req, res) => {
  try {
    const program = await Course.findById(req.params.id);
    if (!program) return res.status(404).json({ message: 'Program not found' });

    const activeCustomers = await Customer.countDocuments({ program: program.name, status: 'subscribed', isDeleted: { $ne: true } });
    const totalCustomers = await Customer.countDocuments({ program: program.name });
    const potentialCustomers = await Customer.countDocuments({ program: program.name, status: 'potential', isDeleted: { $ne: true } });
    const rejectedCustomers = await Customer.countDocuments({ program: program.name, status: 'rejected', isDeleted: { $ne: true } });

    const totalCampaigns = await Campaign.countDocuments({ program: program._id });
    const activeCampaignCount = await Campaign.countDocuments({ program: program._id, status: 'active' });
    const completedCampaignCount = await Campaign.countDocuments({ program: program._id, status: 'completed' });

    const campaigns = await Campaign.find({ program: program._id })
      .populate('assignedEmployees', 'name email role')
      .sort({ createdAt: -1 });

    const activeCampaigns = campaigns.filter(c => c.status === 'active' || c.status === 'scheduled');
    const completedCampaigns = campaigns.filter(c => c.status === 'completed' || c.status === 'cancelled');

    const customers = await Customer.find({ program: program.name, isDeleted: { $ne: true } })
      .populate('assignedEmployee', 'name email role')
      .populate('campaign', 'name')
      .sort({ createdAt: -1 });

    res.json({
      program,
      stats: {
        activeCustomers, totalCustomers, potentialCustomers, rejectedCustomers,
        totalCampaigns, activeCampaigns: activeCampaignCount, completedCampaigns: completedCampaignCount
      },
      activeCampaigns,
      completedCampaigns,
      customers
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createProgram = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const { name, description, price, currency, prices, duration, instructor, startDate, endDate, capacity, status, image } = req.body;

    const CURRENCY_CODES = ['EGP', 'SAR', 'LYD', 'OMR', 'USD'];
    const safePrices = {};
    if (prices && typeof prices === 'object') {
      CURRENCY_CODES.forEach(code => {
        if (prices[code] !== undefined && prices[code] !== null && prices[code] !== '') {
          safePrices[code] = Math.max(0, Number(prices[code]) || 0);
        }
      });
    }
    const primaryCurrency = currency && CURRENCY_CODES.includes(currency) ? currency : 'EGP';
    const primaryPrice = safePrices[primaryCurrency] !== undefined ? safePrices[primaryCurrency] : (Number(price) || 0);

    const program = await Course.create({
      name, description, price: primaryPrice, currency: primaryCurrency, prices: safePrices, duration, instructor,
      startDate, endDate, capacity, status, image
    });

    res.status(201).json({ program });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateProgram = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const allowedFields = ['name', 'description', 'price', 'currency', 'prices', 'duration', 'instructor', 'startDate', 'endDate', 'capacity', 'status', 'image'];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined && req.body[field] !== null) updateData[field] = req.body[field];
    }

    if (updateData.prices && typeof updateData.prices === 'object') {
      const CURRENCY_CODES = ['EGP', 'SAR', 'LYD', 'OMR', 'USD'];
      const safePrices = {};
      CURRENCY_CODES.forEach(code => {
        if (updateData.prices[code] !== undefined && updateData.prices[code] !== null && updateData.prices[code] !== '') {
          safePrices[code] = Math.max(0, Number(updateData.prices[code]) || 0);
        }
      });
      updateData.prices = safePrices;
    }

    if (updateData.currency || updateData.prices) {
      const CURRENCY_CODES = ['EGP', 'SAR', 'LYD', 'OMR', 'USD'];
      const cur = updateData.currency && CURRENCY_CODES.includes(updateData.currency) ? updateData.currency : 'EGP';
      if (updateData.currency !== undefined) updateData.currency = cur;
      const current = await Course.findById(req.params.id).select('price');
      const priceObj = updateData.prices && Object.keys(updateData.prices).length ? updateData.prices : {};
      updateData.price = priceObj[cur] !== undefined ? priceObj[cur] : (req.body.price !== undefined ? Math.max(0, Number(req.body.price) || 0) : (current ? current.price : 0));
    }

    const program = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!program) return res.status(404).json({ message: 'Program not found' });
    res.json({ program });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteProgram = async (req, res) => {
  try {
    const program = await Course.findByIdAndDelete(req.params.id);
    if (!program) return res.status(404).json({ message: 'Program not found' });

    await Campaign.updateMany(
      { program: req.params.id },
      { $set: { program: null } }
    );

    res.json({ message: 'Program deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.exportPrograms = async (req, res) => {
  try {
    const programs = await Course.find().sort({ createdAt: -1 });
    const data = await Promise.all(programs.map(async (p) => {
      const totalCustomers = await Customer.countDocuments({ program: p.name, isDeleted: { $ne: true } });
      const activeCustomers = await Customer.countDocuments({ program: p.name, status: 'subscribed', isDeleted: { $ne: true } });
      const campaigns = await Campaign.find({ program: p._id });
      const totalCampaigns = campaigns.length;
      const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
      const totalRevenue = await Customer.aggregate([
        { $match: { program: p.name, status: 'subscribed', isDeleted: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$payment.totalPrice' } } }
      ]);
      return {
        name: p.name,
        description: p.description,
        price: p.price,
        currency: p.currency || 'EGP',
        prices: p.prices || {},
        duration: p.duration,
        instructor: p.instructor,
        status: p.status,
        startDate: p.startDate ? p.startDate.toISOString().split('T')[0] : '',
        endDate: p.endDate ? p.endDate.toISOString().split('T')[0] : '',
        capacity: p.capacity,
        totalCustomers,
        activeCustomers,
        totalCampaigns,
        activeCampaigns,
        revenue: totalRevenue[0]?.total || 0
      };
    }));
    res.json({ programs: data, count: data.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
