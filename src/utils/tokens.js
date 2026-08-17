const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Generate an access token for a user
 * @param {string} userId - The user's ID
 * @returns {string} JWT access token
 */
const generateAccessToken = (userId) => {
  return jwt.sign(
    {
      sub: userId,
      type: 'access'
    },
    config.jwt.accessSecret,
    {
      expiresIn: config.jwt.accessExpiresIn
    }
  );
};

/**
 * Generate a refresh token for a user
 * @param {string} userId - The user's ID
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    {
      sub: userId,
      type: 'refresh'
    },
    config.jwt.refreshSecret,
    {
      expiresIn: config.jwt.refreshExpiresIn
    }
  );
};

/**
 * Verify an access token
 * @param {string} token - The access token to verify
 * @returns {object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    
    // Ensure the token is of the correct type
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

/**
 * Verify a refresh token
 * @param {string} token - The refresh token to verify
 * @returns {object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret);
    
    // Ensure the token is of the correct type
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
