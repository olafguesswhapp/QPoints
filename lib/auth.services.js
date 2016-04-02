var config = require('../credentials');
var jwt = require('jsonwebtoken');
var expressJwt = require('express-jwt');
var compose = require('composable-middleware');
var CUsers = require('../models/cusers.js');
var validateJwt = expressJwt({
  secret: config.sessionSecret
});

function authenErr(err, req, res, next) {
  if (err) {
    switch (err.message) {
      case 'invalid token':
        return res.status(401).json({ success: false, message: 'Invalid Authorization' });
      case 'jwt expired':
        return res.status(401).json({ success: false, message: 'Authorization has expired' });
      case 'jwt malformed':
        return res.status(401).json({ success: false, message: 'jwt malformed' });
    }
    console.log('switch hat nicht funktioniert');
    console.log(err);
  }
};

/**
 * Attaches the user object to the request if authenticated
 * Otherwise returns 401
 */
function isAuthenticated() {
  return compose()
    // Validate jwt
    .use(function(req, res, next) {
      // allow access_token to be passed through query parameter as well
      if (req.query && req.query.hasOwnProperty('access_token')) {
        req.headers.authorization = 'Bearer ' + req.query.access_token;
      }
      validateJwt(req, res, next);
    })
    .use(authenErr);
};

/**
 * Returns a jwt token signed by the app secret
 */
function signToken(id, role) {
  return jwt.sign({ _id: id, role: role }, config.sessionSecret, { expiresIn: 60 * 60 });
};

exports.isAuthenticated = isAuthenticated;
exports.signToken = signToken;