var Reels = require('../models/reels.js');
var CUsers = require('../models/cusers.js');
var moment = require('moment');

function adminOnly(req, res, next) {
	if (Object.keys(req.session.passport).length > 0) {
		CUsers.findById(req.session.passport.user, function(err, user){
			if(user.role==='admin') {return next();
			} else {
				req.session.flash = {
					type: 'Warnung',
					intro: 'Sie haben nicht das Recht Rollen anzulegen .',
					message: 'Bitte wenden Sie sich an unserer Administration.'
				};
				res.redirect('/rollen');
			}
		});
	} else { 
		res.redirect('/login');
		}
};

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { return next(); }
	req.session.lastPage = req.path;
	req.session.flash = {
		type: 'Warnung',
		intro: 'Sie müssen bitte als User eingelogged sein.',
		message: 'Bitte melden Sie sich mit Ihrem Email und Passwort an.',
	};
	res.redirect('/login');
};

module.exports = {
	registerRoutes: function(app) {
		app.get('/rollen/edit', adminOnly, this.reelEdit);
		app.post('/rollen/edit', adminOnly, this.reelEditProcess);
		app.get('/rollen', ensureAuthenticated, this.library);
		app.get('/rollen/:nr', ensureAuthenticated, this.reelDetail);
	},

	// Einzelne Reel erfassen
	reelEdit: function(req,res){
		Reels.findOne({}, {}, {sort: {'nr' : -1}}, function(err, reel){
			if (!reel) {
				var context = {neueNr : 'R1000001'};
			} else {
				var context = {
					neueNr : reel.nr.match(/\D+/)[0] + (parseInt(reel.nr.match(/\d+/))+1),
				};
			}
			res.render('reels/edit', context);
		});
	}, 

	// Rollen anlegen bzw. editieren
	reelEditProcess: function(req, res, next) {
		// TODO: back-end validation (safety)
		var c = new Reels({
			nr: req.body.nr,
			reelStatus: 'erfasst',
			quantityCodes: req.body.quantityCodes,
			activatedCodes: 0,
			codes: req.body.codes.map(function(Hcode){
				return {
					rCode: Hcode.rCode,
					cStatus: 0,
				}
			}),
			created: moment(new Date()).format('YYYY-MM-DDTHH:mm'),
			createdBy: req.user._id,
		});
		c.save(function(err) {
			if(err) req.session.flash = {
					type: 'Warnung',
					intro: 'Die Rolle kann nicht angelegt werden.',
					message: err.message,
				};;
			res.redirect(303, '/rollen');
		});
	},

	// Übersicht aller Reels anzeigen
	library: function(req,res){
		CUsers.findById(req.user._id, function(err, user){
			Reels.find({'customer': user.customer })
				.sort('nr')
				.populate('assignedProgram')
				.exec(function(err, reels) {
				if (reels.length > 0) {
					var context = {
						reels: reels.map(function(reel){
							return {
								nr: reel.nr,
								reelStatus: reel.reelStatus,
								quantityCodes: reel.quantityCodes,
								activatedCodes: reel.activatedCodes,
								assignedProgram: reel.assignedProgram,
								ersterCode: reel.codes[0].rCode,
							}
						}) // reels.map
					}; // context				
				} else { // if Reels length 
					var context = {
						// customerCompany: user.customer.company,
						reels: {
							reelStatus: 'Sie haben noch keine Rollen bestellt.',
						} 
					}; // contexxt
				} // if reels.length else
				res.render('reels/library', context);		
			}) // Reels find 
		}); // User find
	},

	// Einzelansicht einer Rolle
	reelDetail: function(req, res, next) {
		Reels.findOne({ nr : req.params.nr })
			.populate('assignedProgram', 'nr programName')
			.populate('codes.consumer', 'firstName lastName')
			.exec( function(err, reel) {
			if(err) return res.redirect(303, '/error');
			// if(!reel) return next(); 	// pass this on to 404 handler
			var context = {
				nr: reel.nr,
				reelStatus: reel.reelStatus,
				quantityCodes: reel.quantityCodes,
				activatedCodes: reel.activatedCodes,
				assignedProgram: reel.assignedProgram,
				codes: reel.codes.map(function(code){
					return {
						rCode: code.rCode,
						cStatus: code.cStatus,
						consumer: code.consumer,
						updated: moment(code.updated).format('DD.MM.YYYY   HH:mm'),
					}
				}), // end codes map
			};
			res.render('reels/detail', context);
		});
	},
};

