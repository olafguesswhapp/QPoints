'use strict';

var express = require('express');
var passport = require('passport');
var auth = require('../lib/auth.services');
var moment = require('moment');
var CUsers = require('../models/cusers.js');
var Customers = require('../models/customers.js');
var Reels = require('../models/reels.js');
var qplib = require('../lib/qpointlib.js');

var router = express.Router();

router.post('/login', apiLogin);
router.get('/user',  auth.isAuthenticated(), apiGetUserData);
router.post('/user',  auth.isAuthenticated(), apiUpdateUserProfile);
router.put('/user', apiCreateUserAccount);
router.post('/code',  auth.isAuthenticated(), apiCheckCode);

module.exports = router;

function apiCreateUserAccount(req, res, next) {
	CUsers.findOne({'username' : req.body.userEmail}, function(err, user) {
		if (user) {
			return res.status(403).json({
      	success: false,
      	message : `Ein User mit der Email ${req.body.userEmail} wurde bereits angemeldet.`
      });
		} else if (err) {
			return res.status(500).json({
      	success: false,
      	message : "Bitte entschuldigen Sie, es ist ein Fehler aufgetreten"
      });
		}
		var user = new CUsers ({
	    username: req.body.userEmail,
	    password: req.body.password,
	    created: moment(new Date()).format('YYYY-MM-DDTHH:mm'),
	    role: 'consumer',
		});
		user.save(function(err, newUser){
			if (err) {
				console.log(err);
				return res.status(403).json({
	      	success: false,
	      	message : `Ein User mit der Email ${req.body.userEmail} kann nicht angemeldet werden.`
	      });
			} else {
				return res.json({
	      	success: true,
	      	message : "Danke, der neue User wurde angemeldet."
	      });
			}
		});
	});
};

function apiUpdateUserProfile(req, res, next) {
	CUsers.findById( req.user._id, function (err, userToUpdate){
		if(err || !userToUpdate) {
      return res.status(404).json({
      	success: false,
      	message : "Bitte melden Sie sich als User bei QPoints an"
      });
    } else {
    	if (req.body.passwordNew){userToUpdate.password = req.body.passwordNew}
    	userToUpdate.gender = req.body.gender;
    	userToUpdate.save(function(err, newUser){
    		if (err) {
    			console.log(err);
    			return res.status(500).json({
		      	success: false,
		      	message : "Der User konnte nicht gespeichert werden"
		      });
    		} else {
    			return res.json({
		      	success: true,
		      	message : "Danke, das User Profil wurde upgedated"
		      });
    		}
    	});
    }
	});
};

function apiCheckCode(req, res, next) {
	Reels
    .findOne({'codes.rCode' : req.body.scannedCode})
    .populate('assignedProgram', '_id nr programName startDate deadlineSubmit goalToHit programStatus programKey')
    .populate('customer')
    .exec(function(err, reel) {
    	if (err || !reel) {
    		return res.status(404).json({ success: false, message: 'Dieser QPoint ist nicht vorhanden.' });
    	} else if (reel.reelStatus !== "aktiviert") {
    		return res.status(404).json({
    			success: false,
    			message: 'Der QPoint wurde noch nicht einem Programm zugeordnet, Bitte wenden Sie sich an den Ladeninhaber.'
    		});
    	} else if ( reel.assignedProgram.deadlineSubmit <= new Date() ) {
    		return res.status(404).json({
    			success: false,
    			message: 'Das Programm ist bereits abgelaufen. Der QPoint ist damit nicht mehr gültig.'
    		});
    	}
    	var indexFoundCode;
    	var foundCode = reel.codes.filter(function(code, index){
    		if (code.rCode === req.body.scannedCode) {
    			indexFoundCode = index;
    			return true;
    		}
    	})[0];
    	if (foundCode.cStatus !== 0) {
    		return res.status(403).json({
    			success: false,
    			message: `Der QPoint ${req.body.scannedCode} der Rolle ${reel.nr} wurde bereits verwendet.`
    		});
    	} else if (foundCode.cStatus === 0) {
    		reel.codes[indexFoundCode].cStatus = 1;
        reel.codes[indexFoundCode].consumer = req.user._id;
        reel.codes[indexFoundCode].updated = new Date();
        reel.activatedCodes++;
        if (reel.activatedCodes==reel.quantityCodes){
            reel.reelStatus='erfüllt';
            qplib.checkProgramsReels(reel.assignedProgram._id);
        } // if activatedCodes = quantityCodes
        // comment out for testing purposes *********************************
        reel.save(function(err) {
          if (err) { return next(err); }
        });
        // comment out for testing purposes *********************************
        qplib.updateUserStats(req.user._id, reel.assignedProgram._id, reel.assignedProgram.goalToHit);
    		res.json({
	    		success: true,
	    		message : `Wohl verdient. Der QPoint gehört zum Program ${reel.assignedProgram.programName} (Rolle ${reel.nr})"`,
	    		name: reel.assignedProgram.programName,
          nr: reel.assignedProgram.nr,
          goalToHit: reel.assignedProgram.goalToHit,
          programStatus: reel.assignedProgram.programStatus,
          startDate: reel.assignedProgram.startDate,
          endDate: reel.assignedProgram.deadlineSubmit,
          company: reel.customer.company,
          address1: reel.customer.address1,
          address2: reel.customer.address2,
          city: reel.customer.city,
          zip: reel.customer.zip,
          country: reel.customer.country,
          phone: reel.customer.phone,
          key: reel.assignedProgram.programKey, // Beispiel Code = 2T@
	    	});
	    	return;
    	}
    	console.log('something went wrong');
    	console.log(foundCode);
    }); // Reels.findOne
};

function apiGetUserData(req, res, next) {
	CUsers
		.findById(req.user._id)
		.select(('particiPrograms gender -_id'))
		.populate('particiPrograms.program', '-_id nr programName customer goalToHit programStatus startDate deadlineSubmit programKey')
		.exec(function(err, user){
    if(err || !user) {
    	return res.status(401).json({message: 'Invalid Authorization'}).end();
    } else if (user.particiPrograms.length === 0){
    	res.json({
    		success: true,
    		message : "User-Email und Passwort sind verifiziert. Willkommen",
    		gender: user.gender
    	});
    	return;
    }
    var userData = user.particiPrograms;
    return userData;
   }).then(function(userData){
   		if (userData.particiPrograms.length !== 0) {
   			updateCustomerData(userData, res);
   		} else { return; }
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
    } else if (!user) {
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
