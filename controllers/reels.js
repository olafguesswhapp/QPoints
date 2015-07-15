var Reels = require('../models/reels.js');
var CUsers = require('../models/cusers.js');
var moment = require('moment');
var qplib = require('../lib/qpointlib.js');

module.exports = {
	registerRoutes: function(app) {
		app.get('/rollen/edit', qplib.adminOnly, this.reelEdit);
		app.post('/rollen/edit', qplib.adminOnly, this.reelEditProcess);
		app.get('/rollen', qplib.checkUserRole6above, this.library);
		app.get('/rollen/:nr', qplib.checkUserRole6above, this.reelDetail);
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
						navProgram: 'class="active"',
						current: 'myReels',
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
						navProgram: 'class="active"',
						current: 'myReels',
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
				navProgram: 'class="active"',
				current: 'myReels',
				nr: reel.nr,
				reelStatus: reel.reelStatus,
				quantityCodes: reel.quantityCodes,
				activatedCodes: reel.activatedCodes,
				assignedProgram: reel.assignedProgram,
				codes: reel.codes.map(function(code, indexCode){
					return {
						rCode: indexCode + 1,
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

