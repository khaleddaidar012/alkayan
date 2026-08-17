const Course = require('../models/Course');
const Customer = require('../models/Customer');
const Campaign = require('../models/Campaign');
const User = require('../models/User');

exports.getProgramStats = async (req, res) => {
  try {
    const program = await Course.findById(req.params.id);
    if (!program) return res.status(404).json({ message: 'Program not found' });

    const [
      customerCounts,
      paymentAgg,
      campaignCounts,
      campaignEmployeeAgg
    ] = await Promise.all([
      Customer.aggregate([
        { $match: { program: program.name, isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Customer.aggregate([
        { $match: { program: program.name, status: 'subscribed', isDeleted: { $ne: true } } },
        { $group: {
            _id: null,
            expectedRevenue: { $sum: '$payment.totalPrice' },
            collectedRevenue: { $sum: '$payment.paidAmount' },
            remainingPayments: { $sum: '$payment.remainingAmount' }
        }}
      ]),
      Campaign.aggregate([
        { $match: { program: program._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Campaign.aggregate([
        { $match: { program: program._id } },
        { $unwind: { path: '$assignedEmployees', preserveNullAndEmptyArrays: false } },
        { $group: {
            _id: '$assignedEmployees',
            totalCampaigns: { $sum: 1 },
            activeCampaigns: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            totalLeads: { $sum: '$leadsCount' },
            totalRegistered: { $sum: '$registeredCustomers' }
        }}
      ])
    ]);

    const statusMap = {};
    customerCounts.forEach(s => { statusMap[s._id] = s.count; });
    const campaignStatusMap = {};
    campaignCounts.forEach(s => { campaignStatusMap[s._id] = s.count; });

    // Build employee workload
    let employeeWorkload = [];
    if (campaignEmployeeAgg.length > 0) {
      const employeeIds = campaignEmployeeAgg.map(e => e._id);
      const employees = await User.find({ _id: { $in: employeeIds } }).select('name email role');

      const empCustomerCounts = await Customer.aggregate([
        { $match: { program: program.name, assignedEmployee: { $in: employeeIds }, isDeleted: { $ne: true } } },
        { $group: {
            _id: '$assignedEmployee',
            totalCustomers: { $sum: 1 },
            subscribedCustomers: { $sum: { $cond: [{ $eq: ['$status', 'subscribed'] }, 1, 0] } },
            potentialCustomers: { $sum: { $cond: [{ $eq: ['$status', 'potential'] }, 1, 0] } }
        }}
      ]);

      const custMap = {};
      empCustomerCounts.forEach(e => { custMap[String(e._id)] = e; });

      employeeWorkload = campaignEmployeeAgg.map(agg => {
        const emp = employees.find(e => String(e._id) === String(agg._id));
        const cust = custMap[String(agg._id)] || {};
        return {
          _id: agg._id,
          name: emp?.name || 'Unknown',
          email: emp?.email || '',
          role: emp?.role || '',
          totalCampaigns: agg.totalCampaigns,
          activeCampaigns: agg.activeCampaigns,
          totalLeads: agg.totalLeads,
          totalRegistered: agg.totalRegistered,
          totalCustomers: cust.totalCustomers || 0,
          subscribedCustomers: cust.subscribedCustomers || 0,
          potentialCustomers: cust.potentialCustomers || 0,
          conversionRate: cust.totalCustomers > 0
            ? Math.round((cust.subscribedCustomers / cust.totalCustomers) * 100)
            : 0
        };
      });
    }

    const stats = {
      activeCustomers: statusMap['subscribed'] || 0,
      totalCustomers: customerCounts.reduce((sum, s) => sum + s.count, 0),
      potentialCustomers: statusMap['potential'] || 0,
      rejectedCustomers: statusMap['rejected'] || 0,
      totalCampaigns: campaignCounts.reduce((sum, s) => sum + s.count, 0),
      activeCampaigns: campaignStatusMap['active'] || 0,
      finishedCampaigns: campaignStatusMap['completed'] || 0,
      expectedRevenue: paymentAgg[0]?.expectedRevenue || 0,
      collectedRevenue: paymentAgg[0]?.collectedRevenue || 0,
      remainingPayments: paymentAgg[0]?.remainingPayments || 0,
      employeeWorkload
    };

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
