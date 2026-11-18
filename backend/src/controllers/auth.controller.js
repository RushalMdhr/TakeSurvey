import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import { registerSchema, loginSchema } from '../utils/validation.js';

function signToken(adminId) {
  return jwt.sign({ id: adminId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

export async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);

    const exists = await Admin.findOne({ email: data.email });
    if (exists) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const admin = await Admin.create(data);
    const token = signToken(admin._id);

    res.status(201).json({
      token,
      admin: { id: admin._id, email: admin.email, name: admin.name }
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);

    const admin = await Admin.findOne({ email: data.email }).select('+password');
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await admin.comparePassword(data.password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(admin._id);

    res.json({
      token,
      admin: { id: admin._id, email: admin.email, name: admin.name }
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  // req.admin set by auth middleware
  res.json({
    admin: { id: req.admin._id, email: req.admin.email, name: req.admin.name }
  });
}