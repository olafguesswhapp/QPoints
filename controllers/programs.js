var Programs = require('../models/programs.js');
var Reels = require('../models/reels.js');
var Customers = require('../models/customers.js');
var CUsers = require('../models/cusers.js');
var NewsFeed = require('../models/newsfeed.js');
var moment = require('moment');
var qplib = require('../lib/qpointlib.js');

function allocateReeltoProgram(newReelId, programId){
	Reels.update({ _id: newReelId },
		{ $set: { assignedProgram : programId, reelStatus : 'aktiviert' }},
		{ multi: false }, function(err, reel) {});
	Programs.update({ _id : programId },
		{ $set: { programStatus : 'aktiviert' },
			$push: { allocatedReels : newReelId} },
		{ multi: false }, function(err, program){});
}; // allocateReeltoProgram

function detachReelfromProgram(reelNr, programId){ // 
	Reels.update({ 'nr' : reelNr },
		{ $set: { reelStatus :'zugeordnet' },
			$unset: { assignedProgram : "" }},
			{ multi: false }, function(err, reel){});
	Programs
		.findById(programId)
		.populate('allocatedReels', 'nr') 
		.select('allocatedReels')
		.exec(function(err, program) {
		var executed = false;
		program.allocatedReels.forEach(function(reel, indexR){
			if (reel.nr == reelNr){
				console.log(indexR + ' at ' +  reel);
				program.allocatedReels.splice(indexR, 1);
				executed = true;
			} // if
			if (executed == true) {
			program.save();
			} // if
		}); // program.allocatedReels.forEach
	}); // Programs.findById	
}; // detachReelfromProgram

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
		Programs.findOne({}, {}, {sort: {'nr' : -1}}, function(err, program){
			CUsers.findById(req.user._id).populate('customer', '_id company').exec(function(err, user){
				Reels.find({ 'reelStatus': 'zugeordnet', 'customer': user.customer._id }).populate('assignedPrograms').exec(function(err,reels){
					var newProgramNr = !program ? 'P100001' :
						program.nr.match(/\D+/)[0] + (parseInt(program.nr.match(/\d+/))+1);
					var context = {
						neueNr: newProgramNr,
						dateDefault: moment(new Date()).format('YYYY-MM-DDTHH:mm'),
						customerId: user.customer._id,
						customerCompany : user.customer.company,
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

	programRegistertProcess: function(req,res, next){ // TODO: back-end validation (safety)
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
				Reels.update({ _id: req.body.allocatedReels},
					{ $set: { reelStatus : 'aktiviert', assignedProgram : program._id }},
					{ multi: false }, function(err, reel) {});
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
					console.log(programs.length);
					var context;
					if (programs.length != 0) {
						NewsFeed.find({'newsStatus' : 'zugeordnet', 'customer' : user.customer._id})
								.select('newsStatus customer')
								.exec(function(err, newsFeed){
							var hasNews = newsFeed.length >0 ? true : false
							context = {
								customerCompany: user.customer.company,
								programs: programs.map(function(program){
									return {
										nr: program.nr,
										programStatus: program.programStatus,
										programName: program.programName,
										goalToHit: program.goalToHit,
										startDate: moment(program.startDate).format("DD.MM.YY"),
										deadlineSubmit: moment(program.deadlineSubmit).format("DD.MM.YY"),
										allocatedReels: program.allocatedReels.map(function(reel){
											return {nr: reel.nr}
										}), // allocatedReels.map
										customer: program.customer,
										hasNews: hasNews,
									} // return for programs map
								}) // programs map
							}; // context
							res.render('programs/library', context);
						}); // NewsFeed.find
					} else { // else if no programs
						context = {
							customerCompany: user.customer.company,
							programs: {
								programName: 'Sie haben noch kein Programm angelegt',
							} // programs
						}; // context
						res.render('programs/library', context);
					} // else - no program
			}); // Programs.find
		}); // CUSers.findById
	}, // Library

	// Programm Detail-Ansicht
	programDetail: function(req,res, next){
		CUsers.findById(req.user._id, function(err, user){
			Programs.findOne({ nr : req.params.nr })
					.populate('allocatedReels')
					.populate('createdBy', 'firstName lastName username')
					.exec(function(err, program) {
				Reels.find({ 'reelStatus': 'zugeordnet', 'customer' : user.customer})
					.exec(function(err,reels){
					if(!program) return next(); 	// pass this on to 404 handler
					var context = {
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
		allocateReeltoProgram(req.body.newReelId, req.body.programId);
		res.redirect(303, '/programm/' + req.body.programNr);
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
      		allocateReeltoProgram(req.body.newReelId, req.body.programId);
      		res.redirect(303, '/programm/' + req.body.programNr);
      	} else {
      		res.redirect(303, '/programm');
      	}
      }); // program.save
		}); // Programs.findById
	}, // processProgramEdit

	processDetachReel: function(req, res, next){
		console.log('jetzt Rolle abtrennen');
		detachReelfromProgram(req.body.reelNr,req.body.programId);
		res.redirect(303, '/programm/' + req.body.programNr );
	}, // processDetachreel

};