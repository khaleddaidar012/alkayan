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
      const activeCustomers = await Customer.countDocuments({ program: p.name, status: 'subscribed' });
      const totalEnrollments = await Customer.countDocuments({ program: p.name });
      const activeCampaigns = await Campaign.countDocuments({ program: p._id, status: 'active' });
      return {
        ...p.toObject(),
        activeCustomers,
        totalEnrollments,
        activeCampaigns
      };
    }));

    res.json({ programs: enriched, count: enriched.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProgram = async (req, res) => {
  try {
    const program = await Course.findById(req.params.id);
    if (!program) return res.status(404).json({ message: 'Program not found' });

    const activeCustomers = await Customer.countDocuments({ program: program.name, status: 'subscribed' });
    const totalCustomers = await Customer.countDocuments({ program: program.name });
    const potentialCustomers = await Customer.countDocuments({ program: program.name, status: 'potential' });
    const rejectedCustomers = await Customer.countDocuments({ program: program.name, status: 'rejected' });

    const totalCampaigns = await Campaign.countDocuments({ program: program._id });
    const activeCampaignCount = await Campaign.countDocuments({ program: program._id, status: 'active' });
    const completedCampaignCount = await Campaign.countDocuments({ program: program._id, status: 'completed' });

    const campaigns = await Campaign.find({ program: program._id })
      .populate('assignedEmployees', 'name email role')
      .sort({ createdAt: -1 });

    const activeCampaigns = campaigns.filter(c => c.status === 'active' || c.status === 'scheduled');
    const completedCampaigns = campaigns.filter(c => c.status === 'completed' || c.status === 'cancelled');

    const customers = await Customer.find({ program: program.name })
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

    const { name, description, price, duration, instructor, startDate, endDate, capacity, status, image } = req.body;

    const program = await Course.create({
      name, description, price, duration, instructor,
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

    const allowedFields = ['name', 'description', 'price', 'duration', 'instructor', 'startDate', 'endDate', 'capacity', 'status', 'image'];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined && req.body[field] !== null) updateData[field] = req.body[field];
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
      const totalCustomers = await Customer.countDocuments({ program: p.name });
      const activeCustomers = await Customer.countDocuments({ program: p.name, status: 'subscribed' });
      const campaigns = await Campaign.find({ program: p._id });
      const totalCampaigns = campaigns.length;
      const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
      const totalRevenue = await Customer.aggregate([
        { $match: { program: p.name, status: 'subscribed' } },
        { $group: { _id: null, total: { $sum: '$payment.totalPrice' } } }
      ]);
      return {
        name: p.name,
        description: p.description,
        price: p.price,
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
