var CUsers = require('../models/cusers.js');
var Reels = require('../models/reels.js');

module.exports = {

	registerRoutes: function(app){
		app.get('/apitest', this.codeRequest);
		app.post('/apitest', this.processCodeRequest);

		app.get('/sammler/:id', this.detail); // id erstmal als user (später echter consumer)
	},

	codeRequest: function(req, res, next){
		CUsers.findById(req.user._id, function(err, user){
			var context = { name: user.firstName + ' ' + user.lastName};
			res.render('transaction/apitest', context);
		}); // CUsers find
	},

	processCodeRequest: function(req, res, next){
		Reels.findOne({'codes.rCode' : req.body.qpInput})
					.populate('assignedProgram', 'programName startDate deadlineSubmit')
					.exec(function(err, reel){
			if(err) {
				req.session.flash = {
					type: 'Warnung',
					intro: 'Leider ist ein Fehler aufgetreten.',
					message: err,
				};
				res.redirect(303, '/apitest');
			} // if err
			if (!reel) {
				req.session.flash = {
					type: 'Warnung',
					intro: 'Dieser QPoint ist nicht vorhanden',
					message: req.qpInput,
				};
				res.redirect(303, '/apitest');
			} else {// if !reel
				// gefunden
				if (reel.reelStatus == "aktiviert"){
					if(new Date()<= reel.assignedProgram.deadlineSubmit){
						reel.codes.forEach(function(code){
							if (code.rCode == req.body.qpInput){
								if(code.cStatus=='0'){
									var qpMessage = 'QPoint ' + code.rCode + ' Status ' 
										+ code.cStatus + ' Rolle ' + reel.nr;	
									req.session.flash = {
										type: 'Erfolg',
										intro: 'Der QPoint gehört zum Program ' + reel.assignedProgram.programName,
										message: qpMessage,
									};
									code.cStatus = 1;
									code.consumer = req.user._id;
									code.updated = new Date();
									reel.activatedCodes++; 
									reel.save(function(err) {
										if (err) { return next(err); }
									});
									res.redirect(303, '/apitest');
								} else { // if cStatus = 0
									var qpMessage = 'QPoint ' + code.rCode + ' Status ' 
										+ code.cStatus + ' Rolle ' + reel.nr;	
									req.session.flash = {
										type: 'Warnung',
										intro: 'Der QPoint wurde bereits verwendet',
										message: qpMessage,
									};
									res.redirect(303, '/apitest');
								} // if cStatus not 0
							} // if qpInput
						}); // reel.codes forEach	
				} else { // if Dates
					req.session.flash = {
						type: 'Warnung',
						intro: 'Das Programm ist bereits abgelaufen',
						message: 'Die Rolle ist damit nicht mehr gültig',
					};
					res.redirect(303, '/apitest');
				} // else if Dates
				} else {// if reel = aktiviert
				req.session.flash = {
					type: 'Warnung',
					intro: 'Der QPoint wurde noch nicht einem Programm zugeordnet',
					message: 'Bitte wenden Sie sich an den Ladeninhaber',
				};
				res.redirect(303, '/apitest');
				} // if else reels nicht aktiviert
			} // if else = reels gefunden
		}); // Reels find
	}, // processCodeRequest

	detail: function(req, res, next){
		User.findById
	}, // detail
};