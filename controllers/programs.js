var Programs = require('../models/programs.js');
var Reels = require('../models/reels.js');
var Customers = require('../models/customers.js');
var CUsers = require('../models/cusers.js');
var NewsFeed = require('../models/newsfeed.js');
var moment = require('moment');
var qplib = require('../lib/qpointlib.js');

function allocateReeltoProgram(req, res, next){
	Reels
		.findById(req.body.newReelId)
		.populate('assignedPrograms')
		.exec(function(err, reel){
		reel.assignedProgram = req.body.programId;
		reel.reelStatus = 'aktiviert';
		reel.save();
	});
	Programs.findOne({ _id : req.body.programId }, function(err, program){
		program.allocatedReels.push(req.body.newReelId);
		program.programStatus = 'aktiviert';
		program.save();
		});
	console.log(req.body);
	res.redirect(303, '/programm/' + req.body.programNr);
}; // allocateReeltoProgram

function detachReelfromProgram(req, res, next){
	Reels
		.findOne({ 'nr' : req.body.reelNr })
		.populate('assignedPrograms')
		.exec(function(err, reel){
		reel.reelStatus = 'zugeordnet';
		reel.save();
	});
	Programs
		.findById(req.body.programId)
		.populate('allocatedReels', 'nr') 
		.select('allocatedReels')
		.exec(function(err, program) {
		var executed = false;
		program.allocatedReels.forEach(function(reel, indexR){
			if (reel.nr == req.body.reelNr){
				console.log(indexR + ' at ' +  reel);
				program.allocatedReels.splice(indexR, 1);
				executed = true;
			} // if
			if (executed == true) {
			program.save();
			} // if
		}); // program.allocatedReels.forEach
	});	
}; // allocateReeltoProgram

module.exports = {

	registerRoutes: function(app) {
		app.get('/programm/anlegen', qplib.checkUserRole6above, this.programRegister);
		app.post('/programm/anlegen', qplib.checkUserRole6above, this.programRegistertProcess);
		app.get('/programm', qplib.checkUserRole6above, this.library);
		app.get('/programm/:nr', qplib.checkUserRole6above, this.programDetail);
		app.post('/programm/:nr', qplib.checkUserRole6above, this.programDetailProcess);
		app.get('/programm/edit/:nr', qplib.checkUserRole6above, this.programEdit);
        app.post('/programm/edit/:nr', qplib.checkUserRole6above, this.processProgramEdit);
        app.post('/rolletrennen', qplib.checkUserRole6above, this.processDetachReel);
	},

	// Ein neues Programm anlegen
	programRegister: function(req,res, next) {
		// das Programm mit der bisher höchsten Programm-Nr selektieren [A]
		Programs.findOne({}, {}, {sort: {'nr' : -1}}, function(err, program){
			CUsers.findById(req.user._id).populate('customer', '_id company').exec(function(err, user){
				//Quelle alle noch nicht zugeordneten Rollen [B]
				Reels.find({ 'reelStatus': 'zugeordnet', 'customer': user.customer._id }).populate('assignedPrograms').exec(function(err,reels){
					// Daten für die Template Erstellung
					if (!program) {
						var newProgramNr = 'P100001';
					} else {
						var newProgramNr = program.nr.match(/\D+/)[0] + (parseInt(program.nr.match(/\d+/))+1);
					}
					var context = {
						navProgram: 'class="active"',
						current: 'myPrograms',
						// die letzte Programm-Nr filetieren (string und nr) und um 1 erhöhen [A]
						neueNr: newProgramNr,
						// in Start- und Deadline-Datums das heutige Datum setzen
						dateDefault: moment(new Date()).format('YYYY-MM-DDTHH:mm'),
						// Kunde welchem das Programm zugeordnet ist
						customerId: user.customer._id,
						customerCompany : user.customer.company,
						// Liste der noch nicht zugeordneten Rollen erstellen [B]
						reels: reels.map(function(reel){
							return {
								reelId: reel._id,
								reelNr: reel.nr,}
						}), // Reels map 
					}; // context
				res.render('programs/register', context);
				}); // Reels Find
			}); // Users Find
		}); // Programms Find
	},

	// Programm Anlage umsetzen
	programRegistertProcess: function(req,res, next){
		// TODO: back-end validation (safety)
		var c = new Programs({
			nr: req.body.nr,
			programStatus: 'erstellt',
			customer: req.body.customerId,
			programName: req.body.programName,
			goalToHit: req.body.goalToHit,
			hitGoalsCount: 0,
			redeemCount: 0,
			startDate: req.body.startDate,
			deadlineSubmit: req.body.deadlineSubmit,
			deadlineScan: req.body.deadlineSubmit, //vorerst das gleiche Datum - kann aber später geändert werden
			created: moment(new Date()).format('YYYY-MM-DDTHH:mm'),
			createdBy: req.user._id,
			programKey: "abc123"
		});
		if (req.body.allocatedReels!='') {
			c.allocatedReels = req.body.allocatedReels;
			c.programStatus = 'aktiviert';
		};
		c.save(function(err, program) {
			if(err) return next(err);
			if (req.body.allocatedReels!='') {
				Reels.findOne({ _id: req.body.allocatedReels}, function(err, reel){
					reel.reelStatus = 'aktiviert';
					reel.assignedProgram = program._id;
					reel.save();
					});
				};
			res.redirect(303, '/programm');
		});
	},

	// Übersicht aller angelegten Programme
	library: function(req,res){
		CUsers.findById(req.user._id)
			.populate('customer', 'id company')
			.exec(function(err, user) {			
			Programs.find({customer: user.customer._id})
				.populate('allocatedReels', 'nr')
				.exec(function(err, programs) {
					var context;
					if (programs) {
						NewsFeed.find({'newsStatus' : 'zugeordnet', 'customer' : user.customer._id})
								.select('newsStatus customer')
								.exec(function(err, newsFeed){
							var hasNews = false;
							if (newsFeed.length >0) {
								hasNews=true;
							}
							context = {
								navProgram: 'class="active"',
								current: 'myPrograms',
								customerCompany: user.customer.company,
								programs: programs.map(function(program){
									return {
										nr: program.nr,
										programStatus: program.programStatus,
										programName: program.programName,
										goalToHit: program.goalToHit,
										startDate: moment(program.startDate).format("DD.MM.YY"),
										deadlineSubmit: moment(program.deadlineSubmit).format("DD.MM.YY"),
										// deadlineScan: moment(program.deadlineScan).format("DD.MM.YY HH:mm"),
										allocatedReels: program.allocatedReels.map(function(reel){
											return {nr: reel.nr}
										}), // allocatedReels.map
										customer: program.customer,
										hasNews: hasNews,
									} // return for programs map
								}) // programs map
							}; // context
							console.log(context);
							res.render('programs/library', context);
						}); // NewsFeed.find
					} else { // else if no programs
						context = {
							navProgram: 'class="active"',
							current: 'myPrograms',
							customerCompany: user.customer.company,
							programs: {
								programName: 'Sie haben noch kein Programm angelegt',
							} // programs
						}; // context
					} // else - no program
			}); // Programs.find
		}); // CUSers.findById
	}, // Librars

	// Programm Detail-Ansicht
	programDetail: function(req,res, next){
		CUsers.findById(req.user._id, function(err, user){
			Programs.findOne({ nr : req.params.nr })
					.populate('allocatedReels')
					.populate('createdBy', 'firstName lastName username')
					.exec(function(err, program) {
				Reels.find({ 'reelStatus': 'zugeordnet' , 'customer' : user.customer})
					.exec(function(err,reels){
					if(!program) return next(); 	// pass this on to 404 handler
					var context = {
						navProgram: 'class="active"',
						current: 'myPrograms',
						id: program._id,
						nr: program.nr,
						programStatus: program.programStatus,
						programName: program.programName,
						goalToHit: program.goalToHit,
						startDate: moment(program.startDate).format("YYYY-MM-DDTHH:mm"),
						deadlineSubmit: moment(program.deadlineSubmit).format("YYYY-MM-DDTHH:mm"),
						// deadlineScan: moment(program.deadlineScan).format("DD.MM.YY HH:mm"),
						created: moment(program.created).format("YYYY-MM-DDTHH:mm"),
						createdByName: program.createdBy.firstName + ' ' + program.createdBy.lastName,
						createdBy: program.createdBy.username,
						customerCompany: program.customer.company,
						usersNearGoal: program.usersNearGoal(function(err, consumers){
						}),
						allocatedReels: program.allocatedReels.map(function(reel){
							return {
								nr: reel.nr,
								quantityCodes: reel.quantityCodes,
								activatedCodes: reel.activatedCodes,
							}
						}),
					};
					context.reels = reels.map(function(reel){
						return {
							reelId: reel._id,
							reelNr: reel.nr,}
					});
					res.render('programs/detail', context);
				});
			}); // Programs find
		}); // User for Customer reference
	},

	// Programm eine neue Rolle zuordnen
	programDetailProcess: function(req,res, next){
		allocateReeltoProgram(req, res, next);
	},

	programEdit: function(req, res, next) {
		Programs
			.findOne({ nr : req.params.nr })
			.populate('allocatedReels', 'nr quantityCodes activatedCodes')
			.populate('createdBy', '_id firstName lastName')
			.populate('customer', '_id company')
			.exec(function(err, program){
			Reels
				.find({ 'reelStatus': 'zugeordnet' , 'customer' : program.customer._id})
				.select('reelId nr')
				.exec(function(err,reels) {
				console.log(reels);
				if(!program) return next(); // pass this on to 404 handler
				var context = {
					navProgram: 'class="active"',
					current: 'myPrograms',
					programId: program._id,
					programNr: program.nr,
					programName: program.programName,
					programStatus: program.programStatus,
					goalToHit: program.goalToHit,
					startDate: moment(program.startDate).format('YYYY-MM-DDTHH:mm'),
					deadlineSubmit: moment(program.deadlineSubmit).format('YYYY-MM-DDTHH:mm'),
					// deadlineScan: moment(program.deadlineScan).format("DD.MM.YY HH:mm"),
					created: moment(program.created).format("DD.MM.YY HH:mm"),
					createdById: program.createdBy._id,
					createdByName: program.createdBy.firstName + ' ' + program.createdBy.lastName,
					customerId: program.customer._id,
					customerCompany: program.customer.company,
					allocatedReels: program.allocatedReels.map(function(reel){
							return {
								nr: reel.nr,
								quantityCodes: reel.quantityCodes,
								activatedCodes: reel.activatedCodes,
							} // return map
						}), // program.allocatedReels.map
				}; // context
				context.reels = reels.map(function(reel){
					return {
						reelId: reel._id,
						reelNr: reel.nr,}
				}); // context.reels
				console.log(context);
				res.render('programs/edit', context);
			}); // Reels.find
		}); // Programs.FindOne
	}, // programEdit

	processProgramEdit: function(req, res, next){
		console.log(req.body);
		Programs
			.findById(req.body.programId)
			.exec(function(err, program){
			program.programName = req.body.programName;
			program.programStatus = req.body.programStatus;
			program.goalToHit = req.body.goalToHit;
			program.startDate = req.body.startDate;
			program.deadlineSubmit = req.body.deadlineSubmit;
			program.save(function(err, updatedProgram) {
                if(err) return next(err);
                if (req.body.newReelId.length > 0) {
            	allocateReeltoProgram(req, res, next);
            } else {
            	res.redirect(303, '/programm');
            }
            }); // program.save
		}); // Programs.findById
	}, // processProgramEdit

	processDetachReel: function(req, res, next){
		console.log('jetzt Rolle abtrennen');
		console.log(req.body);
		detachReelfromProgram(req, res, next);
		res.redirect(303, '/programm/' + req.body.programNr );
	}, // processDetachreel

};

