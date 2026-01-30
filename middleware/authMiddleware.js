const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

function authMiddleware(req, res, next) {
  console.log('Auth middleware called for:', req.method, req.path);
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    console.log('Auth failed: Authorization header missing or malformed');
    return res.status(401).json({ error: 'Authorization header missing or malformed' });
  }

  const token = authHeader.split(' ')[1];
  console.log('Token extracted from Authorization header');

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    console.log('Token verified successfully for user:', payload.email);
    req.user = { email: payload.email };
    return next();
  } catch (err) {
    console.log('Token verification failed:', err.name, '-', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;


