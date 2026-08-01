const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const defaultPermissions = {
  customers: { view: false, add: false, edit: false, delete: false },
  programs: { view: false, add: false, edit: false, delete: false },
  campaigns: { view: false, add: false, edit: false, delete: false },
  tasks: { view: false, create: false, updateStatus: false },
  reports: { view: false },
  users: { view: false, create: false, edit: false, delete: false }
};

const adminPermissions = {
  customers: { view: true, add: true, edit: true, delete: true },
  programs: { view: true, add: true, edit: true, delete: true },
  campaigns: { view: true, add: true, edit: true, delete: true },
  tasks: { view: true, create: true, updateStatus: true },
  reports: { view: true },
  users: { view: true, create: true, edit: true, delete: true }
};

const managerPermissions = {
  customers: { view: true, add: false, edit: false, delete: false },
  programs: { view: true, add: true, edit: true, delete: false },
  campaigns: { view: true, add: true, edit: true, delete: false },
  tasks: { view: true, create: true, updateStatus: true },
  reports: { view: false },
  users: { view: false, create: false, edit: false, delete: false }
};

const employeePermissions = {
  customers: { view: true, add: false, edit: false, delete: false },
  programs: { view: true, add: false, edit: false, delete: false },
  campaigns: { view: true, add: false, edit: false, delete: false },
  tasks: { view: true, create: false, updateStatus: true },
  reports: { view: false },
  users: { view: false, create: false, edit: false, delete: false }
};

const getDefaultPermissionsForRole = (role) => {
  switch (role) {
    case 'admin': return JSON.parse(JSON.stringify(adminPermissions));
    case 'manager': return JSON.parse(JSON.stringify(managerPermissions));
    case 'employee': return JSON.parse(JSON.stringify(employeePermissions));
    default: return JSON.parse(JSON.stringify(defaultPermissions));
  }
};

const permissionSchema = new mongoose.Schema({
  view: { type: Boolean, default: false },
  add: { type: Boolean, default: false },
  edit: { type: Boolean, default: false },
  delete: { type: Boolean, default: false },
  create: { type: Boolean, default: false },
  updateStatus: { type: Boolean, default: false }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'employee'],
    default: 'employee'
  },
  permissions: {
    customers: { type: permissionSchema, default: () => ({ view: false, add: false, edit: false, delete: false }) },
    programs: { type: permissionSchema, default: () => ({ view: false, add: false, edit: false, delete: false }) },
    campaigns: { type: permissionSchema, default: () => ({ view: false, add: false, edit: false, delete: false }) },
    tasks: { type: permissionSchema, default: () => ({ view: false, create: false, updateStatus: false }) },
    reports: { type: permissionSchema, default: () => ({ view: false }) },
    users: { type: permissionSchema, default: () => ({ view: false, create: false, edit: false, delete: false }) }
  },
  lang: {
    type: String,
    enum: ['ar', 'en'],
    default: 'ar'
  },
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'light'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.pre('save', function (next) {
  if (this.isModified('role') && !this.isModified('permissions')) {
    const defaults = getDefaultPermissionsForRole(this.role);
    this.permissions = defaults;
  }
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.hasPermission = function (module, action) {
  return this.permissions && this.permissions[module] && this.permissions[module][action] === true;
};

userSchema.statics.getDefaultPermissionsForRole = getDefaultPermissionsForRole;
userSchema.statics.adminPermissions = adminPermissions;
userSchema.statics.managerPermissions = managerPermissions;
userSchema.statics.employeePermissions = employeePermissions;

module.exports = mongoose.model('User', userSchema);
