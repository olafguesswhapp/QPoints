var Programs = require('../models/programs.js');
var Reels = require('../models/reels.js');
var Customer = require('../models/customer.js');
var User = require('../models/user.js');
var moment = require('moment');

function LoggedInUserOnly(req, res, next) {
	if (!req.user) {
		req.session.flash = {
			type: 'Warnung',
			intro: 'Sie müssen bitte als User eingelogged sein.',
			message: 'Bitte melden Sie sich mit Ihrem Email und Passwort an.',
		};
		return res.redirect(303, '/login');
	} else { return next();}
};

module.exports = {

	registerRoutes: function(app) {
		app.get('/programm/anlegen', LoggedInUserOnly, this.programRegister);
		app.post('/programm/anlegen', LoggedInUserOnly, this.programRegistertProcess);
		app.get('/programm', LoggedInUserOnly, this.library);
		app.get('/programm/:nr', LoggedInUserOnly, this.programDetail);
		app.post('/programm/:nr', LoggedInUserOnly, this.programDetailProcess);
	},

	// Ein neues Programm anlegen
	programRegister: function(req,res, next) {
		// das Programm mit der bisher höchsten Programm-Nr selektieren [A]
		Programs.findOne({}, {}, {sort: {'nr' : -1}}, function(err, program){
			//Quelle alle noch nicht zugeordneten Rollen [B]
			Reels.find({ 'reelStatus': false }).populate('assignedPrograms').exec(function(err,reels){
				// Daten für die Template Erstellung
				User.findById(req.user._id).populate('customer', '_id company').exec(function(err, user){
					if (!program) {
						var newProgramNr = 'P100001';
					} else {
						var newProgramNr = program.nr.match(/\D+/)[0] + (parseInt(program.nr.match(/\d+/))+1);
					}
					var context = {
						// die letzte Programm-Nr filetieren (string und nr) und um 1 erhöhen [A]
						neueNr : newProgramNr,
						// in Start- und Deadline-Datums das heutige Datum setzen
						dateDefault : moment(new Date()).format('YYYY-MM-DDTHH:mm'),
						// Kunde welchem das Programm zugeordnet ist
						customerId : user.customer._id,
						customerCompany : user.customer.company,
						// Liste der noch nicht zugeordneten Rollen erstellen [B]
						reels: reels.map(function(reel){
							return {
								reelId: reel._id,
								reelNr: reel.nr,}
						}),
					};
				res.render('programs/register', context);
				});
			});
		});
	},

	// Programm Anlage umsetzen
	programRegistertProcess: function(req,res, next){
		// TODO: back-end validation (safety)
		var c = new Programs({
			nr: req.body.nr,
			customer: req.body.customerId,
			programName: req.body.programName,
			goalCount: req.body.goalCount,
			startDate: req.body.startDate,
			deadlineSubmit: req.body.deadlineSubmit,
			deadlineScan: req.body.deadlineSubmit, //vorerst das gleiche Datum - kann aber später geändert werden
			created: moment(new Date()).format('YYYY-MM-DDTHH:mm'),
			createdBy: req.user._id,
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
		User.findById(req.user._id)
			.populate('customer', 'id company')
			.exec(function(err, user) {			
			Programs.find({customer: user.customer._id})
				.populate('allocatedReels', 'nr')
				.exec(function(err, programs) {
					if (programs) {
						var context = {
							customerCompany: user.customer.company,
							programs: programs.map(function(program){
								return {
									nr: program.nr,
									programName: program.programName,
									goalCount: program.goalCount,
									startDate: moment(program.startDate).format("DD.MM.YY HH:mm"),
									deadlineSubmit: moment(program.deadlineSubmit).format("DD.MM.YY HH:mm"),
									// deadlineScan: moment(program.deadlineScan).format("DD.MM.YY HH:mm"),
									allocatedReels: program.allocatedReels.map(function(reel){
										return {nr: reel.nr}
									}),
									customer: program.customer,
								}
							})
						};
					} else {
						var context = {
							customerCompany: user.customer.company,
							programs: {
								programName: 'Sie haben noch kein Programm angelegt',
							}
						};
					}
				res.render('programs/library', context);		
			});
		});
	},

	// Programm Detail-Ansicht
	programDetail: function(req,res, next){
		Programs.findOne({ nr : req.params.nr })
				.populate('allocatedReels', 'nr')
				.populate('createdBy', 'firstName lastName')
				.exec(function(err, program) {
			Reels.find({ 'reelStatus': 'erfasst' }, function(err,reels){
				if(!program) return next(); 	// pass this on to 404 handler
				var context = {
					id: program._id,
					nr: program.nr,
					programName: program.programName,
					goalCount: program.goalCount,
					startDate: moment(program.startDate).format("DD.MM.YY HH:mm"),
					deadlineSubmit: moment(program.deadlineSubmit).format("DD.MM.YY HH:mm"),
					// deadlineScan: moment(program.deadlineScan).format("DD.MM.YY HH:mm"),
					created: moment(program.created).format("DD.MM.YY HH:mm"),
					createdByName: program.createdBy.firstName + ' ' + program.createdBy.lastName,
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