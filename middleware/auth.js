const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protects routes: verifies the JWT sent in the Authorization header,
// then attaches the logged-in user to req.user for downstream controllers.
const protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    // Expecting header format: "Authorization: Bearer <token>"
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. No token provided.',
      });
    }

    // Verify token signature and expiry using our secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch the user and attach to request (without the password field)
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. User no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    // Covers invalid signature, malformed token, and expired token cases
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Token failed or expired.',
    });
  }
};

module.exports = { protect };
