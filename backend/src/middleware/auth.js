import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(payload.id);
    if (!admin) {
      return res.status(401).json({ message: 'Admin no longer exists' });
    }

    req.admin = admin;   // attach for controllers to use
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}