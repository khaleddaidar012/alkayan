const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ users, count: users.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, email, password, role, permissions } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const userPermissions = permissions || User.getDefaultPermissionsForRole(role || 'employee');

    const user = await User.create({ name, email, password, role, permissions: userPermissions });

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, email, role, isActive } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updatePermissions = async (req, res) => {
  try {
    const { permissions } = req.body;

    if (!permissions) {
      return res.status(400).json({ message: 'Permissions object is required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const allowedModules = ['customers', 'programs', 'tasks', 'reports', 'users'];
    const allowedActions = ['view', 'add', 'edit', 'delete', 'create', 'updateStatus'];

    const sanitizedPermissions = {};
    for (const mod of allowedModules) {
      if (permissions[mod]) {
        sanitizedPermissions[mod] = {};
        for (const action of allowedActions) {
          if (permissions[mod][action] !== undefined) {
            sanitizedPermissions[mod][action] = Boolean(permissions[mod][action]);
          } else if (user.permissions[mod] && user.permissions[mod][action] !== undefined) {
            sanitizedPermissions[mod][action] = user.permissions[mod][action];
          }
        }
      } else if (user.permissions[mod]) {
        sanitizedPermissions[mod] = user.permissions[mod];
      }
    }

    user.permissions = sanitizedPermissions;
    await user.save();

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.toggleStatus = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot change your own status' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
