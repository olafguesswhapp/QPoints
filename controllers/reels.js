var Reels = require('../models/reels.js');

module.exports = {
	registerRoutes: function(app) {
		app.get('/reels/edit', this.reelEdit);
		app.post('/reels/edit', this.reelEditProcess);
		app.get('/reels', this.home);
		app.get('/reels/:nr', this.reelDetail);
	},

	// Einzelne Reel erfassen
	reelEdit: function(req,res){
		res.render('reels/edit');
	}, 

	reelEditProcess: function(req, res) {
		console.log('die Herausforderung ' + req.body.codes.length);		
		// TODO: back-end validation (safety)
		var c = new Reels({
			nr: req.body.nr,
			firstName: req.body.firstName,
			reelStatus: req.body.reelStatus,
			quantityCodes: req.body.quantityCodes,
			assignedProgram: req.body.assignedProgram,
			codes: req.body.codes.map(function(Hcode){
				return {
					rCode: Hcode.rCode,
					cStatus: Hcode.cStatus,
				}
			}),
		});
		c.save(function(err) {
			if(err) return next(err);
			res.redirect(303, '/reels');
		});
	},

	// Übersicht aller Reels anzeigen
	home: function(req,res){
		Reels.find(function(err, reels) {
			// console.log(reels);
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

	reelDetail: function(req, res) {
		Reels.find({ nr : req.params.nr }, function(err, reel) {
			if(err) return res.redirect(303, '/error');
			if(!reel) return next(); 	// pass this on to 404 handler
			res.render('reels/detail', reel[0]);
		});
	},
};

