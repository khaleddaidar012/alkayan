const Course = require('../models/Course');
const Campaign = require('../models/Campaign');
const Customer = require('../models/Customer');
const User = require('../models/User');

exports.getAggregatedReports = async (req, res) => {
  try {
    const [
      topPrograms,
      topCampaigns,
      topEmployees,
      programRevenue,
      registrationsOverTime,
      campaignROI,
      paymentStats
    ] = await Promise.all([
      // 1. Most successful programs by enrollments & revenue
      Customer.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: {
            _id: '$program',
            totalEnrollments: { $sum: 1 },
            subscribed: { $sum: { $cond: [{ $eq: ['$status', 'subscribed'] }, 1, 0] } },
            totalRevenue: { $sum: '$payment.finalPrice' },
            collectedRevenue: { $sum: '$payment.paidAmount' }
        }},
        { $sort: { totalEnrollments: -1 } },
        { $limit: 10 }
      ]),

      // 2. Best performing campaigns by conversion rate
      Campaign.aggregate([
        { $project: {
            name: 1,
            program: 1,
            leadsCount: 1,
            registeredCustomers: 1,
            conversionRate: 1,
            budget: 1,
            status: 1,
            startDate: 1,
            endDate: 1
        }},
        { $sort: { conversionRate: -1 } },
        { $limit: 10 }
      ]),

      // 3. Best employees by conversion rate
      Customer.aggregate([
        { $match: { assignedEmployee: { $ne: null }, isDeleted: { $ne: true } } },
        { $group: {
            _id: '$assignedEmployee',
            totalCustomers: { $sum: 1 },
            subscribedCustomers: { $sum: { $cond: [{ $eq: ['$status', 'subscribed'] }, 1, 0] } },
            potentialCustomers: { $sum: { $cond: [{ $eq: ['$status', 'potential'] }, 1, 0] } }
        }},
        { $addFields: {
            conversionRate: {
              $cond: [
                { $gt: ['$totalCustomers', 0] },
                { $multiply: [{ $divide: ['$subscribedCustomers', '$totalCustomers'] }, 100] },
                0
              ]
            }
        }},
        { $sort: { conversionRate: -1 } },
        { $limit: 10 }
      ]),

      // 4. Revenue by program
      Customer.aggregate([
        { $match: { status: 'subscribed', isDeleted: { $ne: true } } },
        { $group: {
            _id: '$program',
            expectedRevenue: { $sum: '$payment.finalPrice' },
            collectedRevenue: { $sum: '$payment.paidAmount' },
            remainingRevenue: { $sum: '$payment.remainingAmount' },
            customerCount: { $sum: 1 }
        }},
        { $sort: { expectedRevenue: -1 } }
      ]),

      // 5. Registrations over time (last 12 months)
      Customer.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: {
            _id: {
              year: { $year: '$registrationDate' },
              month: { $month: '$registrationDate' }
            },
            count: { $sum: 1 },
            subscribed: { $sum: { $cond: [{ $eq: ['$status', 'subscribed'] }, 1, 0] } }
        }},
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ]),

      // 6. Campaign ROI
      Campaign.aggregate([
        { $match: { budget: { $gt: 0 } } },
        { $lookup: {
            from: 'customers',
            localField: '_id',
            foreignField: 'campaign',
            as: 'campaignCustomers'
        }},
        { $addFields: {
            campaignRevenue: {
              $reduce: {
                input: '$campaignCustomers',
                initialValue: 0,
                in: { $add: ['$$value', '$$this.payment.finalPrice'] }
              }
            },
            customerCount: { $size: '$campaignCustomers' }
        }},
        { $project: {
            name: 1,
            program: 1,
            budget: 1,
            campaignRevenue: 1,
            customerCount: 1,
            roi: {
              $cond: [
                { $gt: ['$budget', 0] },
                {
                  $multiply: [
                    {
                      $divide: [
                        { $subtract: ['$campaignRevenue', '$budget'] },
                        '$budget'
                      ]
                    },
                    100
                  ]
                },
                0
              ]
            },
            leadsCount: 1,
            registeredCustomers: 1,
            conversionRate: 1
        }},
        { $sort: { roi: -1 } },
        { $limit: 10 }
      ]),

      // 7. Payment statistics
      Customer.aggregate([
        { $match: { status: 'subscribed', isDeleted: { $ne: true } } },
        { $group: {
            _id: null,
            totalExpected: { $sum: '$payment.finalPrice' },
            totalReceived: { $sum: '$payment.paidAmount' },
            totalRemaining: { $sum: '$payment.remainingAmount' },
            fullyPaid: { $sum: { $cond: [{ $eq: ['$payment.status', 'fullyPaid'] }, 1, 0] } },
            partiallyPaid: { $sum: { $cond: [{ $eq: ['$payment.status', 'partiallyPaid'] }, 1, 0] } },
            notPaid: { $sum: { $cond: [{ $eq: ['$payment.status', 'notPaid'] }, 1, 0] } },
            withBalance: { $sum: { $cond: [{ $gt: ['$payment.remainingAmount', 0] }, 1, 0] } }
        }}
      ])
    ]);

    // Enrich topPrograms with program names
    const programNames = await Course.find({
      name: { $in: topPrograms.map(p => p._id).filter(Boolean) }
    }).select('name');
    const progNameMap = {};
    programNames.forEach(p => { progNameMap[p.name] = p.name; });

    // Enrich topEmployees with user names
    const empIds = topEmployees.map(e => e._id).filter(Boolean);
    const employees = await User.find({ _id: { $in: empIds } }).select('name email role');
    const empMap = {};
    employees.forEach(e => { empMap[String(e._id)] = e; });
    const enrichedEmployees = topEmployees.map(e => ({
      ...e,
      name: empMap[String(e._id)]?.name || 'Unknown',
      email: empMap[String(e._id)]?.email || '',
      role: empMap[String(e._id)]?.role || ''
    }));

    // Enrich campaign data with program names
    const campaignProgramIds = [...new Set(topCampaigns.map(c => c.program).filter(Boolean))];
    const campaignPrograms = await Course.find({ _id: { $in: campaignProgramIds } }).select('name');
    const campProgMap = {};
    campaignPrograms.forEach(p => { campProgMap[String(p._id)] = p.name; });
    const enrichedCampaigns = topCampaigns.map(c => ({
      ...c,
      programName: campProgMap[String(c.program)] || 'Unknown'
    }));

    const paymentStatsData = paymentStats.length > 0 ? paymentStats[0] : { totalExpected: 0, totalReceived: 0, totalRemaining: 0, fullyPaid: 0, partiallyPaid: 0, notPaid: 0, withBalance: 0 };

    res.json({
      topPrograms: topPrograms.map(p => ({
        name: p._id || 'Unknown',
        totalEnrollments: p.totalEnrollments,
        subscribed: p.subscribed,
        totalRevenue: p.totalRevenue,
        collectedRevenue: p.collectedRevenue
      })),
      topCampaigns: enrichedCampaigns,
      topEmployees: enrichedEmployees,
      programRevenue,
      registrationsOverTime,
      campaignROI,
      paymentStats: paymentStatsData
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};