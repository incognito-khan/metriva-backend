const { verifyAccessToken } = require('../utils/tokens');

/**
 * Authentication middleware
 * Verifies access token from HttpOnly cookie and attaches user identity to request
 */
const authenticate = (req, res, next) => {
  try {
    // Read access token from HttpOnly cookie
    const accessToken = req.cookies.accessToken;

    // If access token is missing, return 401 Unauthorized
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify the access token using the existing utility
    const decoded = verifyAccessToken(accessToken);

    // Attach authenticated user's identity to request object
    req.user = { id: decoded.sub };

    // Proceed to the next middleware/route handler
    next();
  } catch (error) {
    // If token is invalid, malformed, expired, or incorrectly signed, return 401
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token'
    });
  }
};

module.exports = authenticate;
