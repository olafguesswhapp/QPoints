var Reels = require('../models/reels.js');
var Authent = require('../handlers/authent.js');

module.exports = {
	registerRoutes: function(app) {
		app.get('/rollen/edit', Authent.CustomerOnly, this.reelEdit);
		app.post('/rollen/edit', this.reelEditProcess);
		app.get('/rollen', this.home);
		app.get('/rollen/:nr', this.reelDetail);
	},

	// Einzelne Reel erfassen
	reelEdit: function(req,res){
		Reels.findOne({}, {}, {sort: {'nr' : -1}}, function(err, reel){
			var context = {
				neueNr : reel.nr.match(/\D+/)[0] + (parseInt(reel.nr.match(/\d+/))+1),
			};
			res.render('reels/edit', context);
		});
	}, 

	// Rollen anlegen bzw. editieren
	reelEditProcess: function(req, res) {
		// TODO: back-end validation (safety)
		var c = new Reels({
			nr: req.body.nr,
			firstName: req.body.firstName,
			reelStatus: req.body.reelStatus,
			quantityCodes: req.body.quantityCodes,
			codes: req.body.codes.map(function(Hcode){
				return {
					rCode: Hcode.rCode,
					cStatus: Hcode.cStatus,
				}
			}),
		});
		c.save(function(err) {
			if(err) return next(err);
			res.redirect(303, '/rollen');
		});
	},

	// Übersicht aller Reels anzeigen
	home: function(req,res){
		Reels.find({})
			.populate('assignedProgram')
			.exec(function(err, reels) {
			var context = {
				reels: reels.map(function(reel){
					return {
						nr: reel.nr,
						reelStatus: reel.reelStatus,
						quantityCodes: reel.quantityCodes,
						assignedProgram: reel.assignedProgram,
						ersterCode: reel.codes[0].rCode,
					}
				})
			};
			res.render('reels/library', context);		
		})
	},

	// Einzelansicht einer Rolle
	reelDetail: function(req, res, next) {
		Reels.findOne({ nr : req.params.nr })
			.populate('assignedProgram')
			.exec( function(err, reel) {
			if(err) return res.redirect(303, '/error');
			// if(!reel) return next(); 	// pass this on to 404 handler
			var context = {
				nr: reel.nr,
				reelStatus: reel.reelStatus,
				quantityCodes: reel.quantityCodes,
				assignedProgram: reel.assignedProgram,
				codes: reel.codes,
			};
			res.render('reels/detail', context);
		});
	},
};

