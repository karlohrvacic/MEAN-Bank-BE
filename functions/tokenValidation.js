const jwt = require('jsonwebtoken');
const { secret } = require('../config');

function tokenValidation(req, res, next) {
  const token = req.headers['x-access-token'];

  if (token) {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        return res.status(403).send({
          success: false,
          message: 'Invalid token',
        });
      }
      req.decoded = decoded;
      next();
    }, null);
  } else {
    return res.status(403).send({
      success: false,
      message: 'No token available',
    });
  }
}

module.exports = tokenValidation;
