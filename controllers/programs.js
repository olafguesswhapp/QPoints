var Programs = require('../models/programs.js');
var moment = require('moment');
var Reels = require('../models/reels.js');

module.exports = {

	registerRoutes: function(app) {
		app.get('/programm/anlegen', this.programRegister);
		app.post('/programm/anlegen', this.programRegistertProcess);
		app.get('/programm', this.library);
		app.get('/programm/:nr', this.programDetail);
		app.post('/programm/:nr', this.programDetailProcess);
	},

	// Ein neues Programm anlegen
	programRegister: function(req,res, next) {
		Reels.find({ 'reelStatus': false }).populate('assignedPrograms').exec(function(err,reels){
			var context = {
				dateDefault : moment(new Date()).format('YYYY-MM-DDTHH:mm'),
				reels: reels.map(function(reel){
					return {
						reelId: reel._id,
						reelNr: reel.nr,}
				}),
			}
			res.render('programs/register', context);
		});
	},

	// Programm Anlage umsetzen
	programRegistertProcess: function(req,res, next){
		// TODO: back-end validation (safety)
		var c = new Programs({
			nr: req.body.nr,
			// customer: req.body.customer,
			programName: req.body.programName,
			goalCount: req.body.goalCount,
			startDate: req.body.startDate,
			deadlineSubmit: req.body.deadlineSubmit,
			deadlineScan: req.body.deadlineScan,
		});
		if (req.body.allocatedReels!='') {
			c.allocatedReels = req.body.allocatedReels;
		};
		c.save(function(err, program) {
			if(err) return next(err);
			if (req.body.allocatedReels!='') {
				Reels.findOne({ _id: req.body.allocatedReels}, function(err, reel){
					reel.reelStatus = true;
					reel.assignedProgram = program._id;
					reel.save();
					});
				};
			res.redirect(303, '/programm');
		});
	},

	// Übersicht aller angelegten Programme
	library: function(req,res){
		Programs.find({}).populate('allocatedReels', 'nr').exec(function(err, programs) {
			var context = {
				programs: programs.map(function(program){
					return {
						nr: program.nr,
						programName: program.programName,
						goalCount: program.goalCount,
						startDate: moment(program.startDate).format("DD.MM.YY HH:mm"),
						deadlineSubmit: moment(program.deadlineSubmit).format("DD.MM.YY HH:mm"),
						deadlineScan: moment(program.deadlineScan).format("DD.MM.YY HH:mm"),
						allocatedReels: program.allocatedReels.map(function(reel){
							return {nr: reel.nr}
						}),
						customer: program.customer,
					}
				})
			};
			res.render('programs/library', context);		
		})
	},

	// Programm Detail-Ansicht
	programDetail: function(req,res, next){
		Programs.findOne({ nr : req.params.nr })
				.populate('allocatedReels')
				.exec(function(err, program) {
			Reels.find({ 'reelStatus': false }, function(err,reels){
				if(!program) return next(); 	// pass this on to 404 handler
				var context = {
					id: program._id,
					nr: program.nr,
					programName: program.programName,
					goalCount: program.goalCount,
					startDate: moment(program.startDate).format("DD.MM.YY HH:mm"),
					deadlineSubmit: moment(program.deadlineSubmit).format("DD.MM.YY HH:mm"),
					deadlineScan: moment(program.deadlineScan).format("DD.MM.YY HH:mm"),
					allocatedReels: program.allocatedReels.map(function(reel){
						return {nr: reel.nr}
					}),
					customer: program.customer,
				};
				context.reels = reels.map(function(reel){
					return {
						reelId: reel._id,
						reelNr: reel.nr,}
				});
				res.render('programs/detail', context);
			});
		});
	},

	// Programm eine neue Rolle zuordnen
	programDetailProcess: function(req,res, next){
		Reels.findOne({ _id : req.body.newReelId })
			.populate('assignedPrograms')
			.exec(function(err, reel){
			reel.assignedProgram = req.body.programId;
			reel.reelStatus = true;
			reel.save();
		});
		Programs.findOne({ _id : req.body.programId }, function(err, program){
			program.allocatedReels.push(req.body.newReelId);
			program.save();
			});	
		res.redirect(303, '/programm');
	},	
};