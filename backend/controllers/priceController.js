const ProgramPrice = require('../models/ProgramPrice');
const { validationResult } = require('express-validator');

exports.getPrices = async (req, res) => {
  try {
    const doc = await ProgramPrice.getSingleton();
    res.json({ prices: doc.toPricingObject() });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updatePrices = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    const allowed = ['egypt_price', 'saudi_arabia_price', 'oman_price', 'libya_price', 'usd_fallback_price'];
    const updateData = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        const val = Number(req.body[field]);
        if (isNaN(val) || val < 0) {
          return res.status(400).json({ message: `${field} must be a positive number` });
        }
        updateData[field] = val;
      }
    }

    let doc = await ProgramPrice.getSingleton();
    Object.assign(doc, updateData);
    await doc.save();

    res.json({ prices: doc.toPricingObject(), message: 'Prices updated successfully' });
  } catch (error) {
    console.error('Update prices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};