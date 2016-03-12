'use strict';

var express = require('express');
var passport = require('passport');
var auth = require('../lib/auth.services');
var CUsers = require('../models/cusers.js');
var Customers = require('../models/customers.js');

var router = express.Router();

router.post('/login', apiLogin);
router.get('/user',  auth.isAuthenticated(), apiGetUserData); //

module.exports = router;

function apiGetUserData(req, res, next) {
	CUsers
		.findById(req.user._id)
		.select(('particiPrograms gender -_id'))
		.populate('particiPrograms.program', '-_id nr programName customer goalToHit programStatus startDate deadlineSubmit programKey')
		.exec(function(err, user){
    if(err || !user) {
    	return res.status(401).end();
    } else if (user.particiPrograms.length === 0){
    	res.json({
    		success: true,
    		message : "User-Email und Passwort sind verifiziert. Willkommen",
    		gender: user.gender
    	});
    }
    var userData = user.particiPrograms;
    return userData;
   }).then(function(userData){
   		updateCustomerData(userData, res);
	   });
};

function updateCustomerData(userData, res){
	var programData = [];
	var programLength = userData.particiPrograms.length;
	userData.particiPrograms.forEach(function(program, indexP){
		Customers.findById(program.program.customer)
			.select('company city address1 address2 zip state country phone')
			.exec(function(err, customer){
					var data = {
						programNr: program.program.nr,
						programName: program.program.programName,
						programCompany: customer.company,
						address1: customer.address1,
						address2: customer.address2,
						zip: customer.zip,
						city: customer.city,
						state: customer.state,
						country: customer.country,
						phone: customer.phone,
						programGoal: program.program.goalToHit,
						myCount: program.countPoints,
						programsFinished: program.countToRedeem,
						programStatus: program.program.programStatus,
						programStartDate: program.program.startDate,
						programEndDate: program.program.deadlineSubmit,
						programKey: program.program.programKey
					};
				programData.push(data);
				return programData;
		}).then(function(data){
			if (indexP === programLength-1) {
				res.json({
					success: true,
					message: 'hat geklappt',
					programData: programData
				});
			}
		});
	});
};

function apiLogin(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    var error = err || info;
    if (error) {
      return res.status(401).json(error);
    }
    if (!user) {
      return res.status(404).json({message: 'Something went wrong, please try again.'});
    }
    var token = auth.signToken(user._id, user.role);
    res.json({
    	success: true,
    	token: token,
    	role: user.role,
    	gender: user.gender
    });
  })(req, res, next)
};
