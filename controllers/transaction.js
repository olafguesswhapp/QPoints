var CUsers = require('../models/cusers.js');
var Reels = require('../models/reels.js');
var Programs = require('../models/programs.js');
var Customers = require('../models/customers.js');

// Check whether Program still does have reel with free codes
checkProgramsReels = function(programId, cb){
	var progReelStatus = true;
	Programs.findById(programId)
			.populate('allocatedReels', 'nr reelStatus')
			.exec(function(err, program){	    
	    program.allocatedReels.forEach(function(reels){
	        if (reels.reelStatus=='erfüllt') {progReelStatus=false;}
	    }); // forEach AllocatedReels
	    if (progReelStatus == false) {
					program.programStatus = 'inaktiv';
					program.save(function(err){
						if (err) { return next(err); }
					});
	    } // end if progReelStatus=false
    }); // Users find
}; // function checkProgramsReels

// when a code is scanned update the code/program in the stats of the user
updateUserStats = function(userId, programId, goalCount){
	CUsers.findById(userId)
		.populate('particiPrograms.program', '_id')
		.exec(function(err, user){
			var i = true;
			var progArray = new Array;
			user.particiPrograms.forEach(function(particiProgram){
				if(JSON.stringify(particiProgram.program._id)==JSON.stringify(programId)){ // does User already participate in Program?
					particiProgram.count++;
					i= false;
					if(particiProgram.count==goalCount){
						particiProgram.count = 0;
						updateUserfinishedStats(userId, programId);
					} // with new Code goal has been acchieved
				} // if User already participates in the program
			}); // forEach particiProgram
			if (i==true){ // 1st Program Code - therefore expand User Stats
				progArray = {
					program: programId,
					count: 1
				};
				user.particiPrograms.push(progArray);
			} // 1st Program Code - therefore expand User Stats
			user.save(function(err){
				if (err) { return next(err);}
			}); // save updated User Stats
		}); // CUserFind
}; // function update User Stats with scanned Program codes

// when a user reached a program's goal updated the users finished stats
updateUserfinishedStats = function(userId, programId){
	CUsers.findById(userId)
		.populate('finishedPrograms.program', '_id')
		.exec(function(err, user){
		var i = true;
		var progArray = new Array;
		user.finishedPrograms.forEach(function(finishedProgram){
			if(JSON.stringify(finishedProgram.program._id)==JSON.stringify(programId)){
				finishedProgram.finishedCount++;
				i=false;
			} // User already has reached once goal in program
		}); // forEach finishedProgram
		if (i==true){ // 1st time goal in this program has been reached
			progArray={
				program: programId,
				finishedCount: 1
			};
			user.finishedPrograms.push(progArray);
		} // 1st time goal in this program has been reached
		user.save(function(err){
			if (err) { return next(err);}
		}); // save updated User Stats
	}); // CUsersFind
}; // function updateUserFinishedStats

function LoggedInUserOnly(req, res, next) {
	if (!req.user) {
		req.session.flash = {
			type: 'Warnung',
			intro: 'Sie müssen bitte als User eingelogged sein.',
			message: 'Bitte melden Sie sich mit Ihrem Email und Passwort an.',
		};
		req.session.lastPage = req.path;
		return res.redirect(303, '/login');
	} else { return next();}
};

module.exports = {

	registerRoutes: function(app){
		app.get('/scan', LoggedInUserOnly, this.scan);
		app.post('/scan', this.processScan);

		app.get('/meinepunkte', this.myPoints);
		app.get('/einzuloesen', this.toRedeem);
		app.get('/firma/:nr', this.customerDetail);
	},

	scan: function(req, res, next){
		CUsers.findById(req.user._id, function(err, user){
			var context = { 
				layout: "app",
				name: user.firstName + ' ' + user.lastName
			};
			res.render('transaction/scan', context);
		}); // CUsers find
	},

	processScan: function(req, res, next){
		Reels.findOne({'codes.rCode' : req.body.qpInput})
					.populate('assignedProgram', '_id programName startDate deadlineSubmit goalCount')
					.exec(function(err, reel){
			if(err) {
				req.session.flash = {
					type: 'Warnung',
					intro: 'Leider ist ein Fehler aufgetreten.',
					message: err,
				};
				res.redirect(303, '/scan');
			} // if err
			if (!reel) {
				req.session.flash = {
					type: 'Warnung',
					intro: 'Dieser QPoint ist nicht vorhanden',
					message: req.qpInput,
				};
				res.redirect(303, '/scan');
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
									if (reel.activatedCodes==reel.quantityCodes){
										reel.reelStatus='erfüllt';
										checkProgramsReels(reel.assignedProgram._id);
									} // if activatedCodes = quantityCodes
									reel.save(function(err) {
										if (err) { return next(err); }
									});
									updateUserStats(req.user._id, reel.assignedProgram._id, reel.assignedProgram.goalCount);
									res.redirect(303, '/scan');
								} else { // if cStatus = 0
									var qpMessage = 'QPoint ' + code.rCode + ' Status ' 
										+ code.cStatus + ' Rolle ' + reel.nr;	
									req.session.flash = {
										type: 'Warnung',
										intro: 'Der QPoint wurde bereits verwendet',
										message: qpMessage,
									};
									res.redirect(303, '/scan');
								} // if cStatus not 0
							} // if qpInput
						}); // reel.codes forEach	
				} else { // if Dates
					req.session.flash = {
						type: 'Warnung',
						intro: 'Das Programm ist bereits abgelaufen',
						message: 'Die Rolle ist damit nicht mehr gültig',
					};
					res.redirect(303, '/scan');
				} // else if Dates
				} else {// if reel = aktiviert
				req.session.flash = {
					type: 'Warnung',
					intro: 'Der QPoint wurde noch nicht einem Programm zugeordnet',
					message: 'Bitte wenden Sie sich an den Ladeninhaber',
				};
				res.redirect(303, '/scan');
				} // if else reels nicht aktiviert
			} // if else = reels gefunden
		}); // Reels find
	}, // processCodeRequest

	myPoints: function(req, res, next){
		CUsers.findById(req.user._id)
			.populate('particiPrograms.program', 'programName programStatus goalCount customer')
			.exec(function(err, user){
				var context ={
					layout: 'app',
					programs: user.particiPrograms.map(function(partiProgram){
						return {
							programName: partiProgram.program.programName,
							programStatus: partiProgram.program.programStatus,
							programCustomer: partiProgram.program.customer,
							goalCount: partiProgram.program.goalCount,
							count: partiProgram.count
						}
					}), // map programs
				}; // define context
				context.programs.forEach(function(program){
					Customers.findById(program.programCustomer)
						.select('nr company')
						.exec(function(err, cust){
							program.company = cust.company;
							program.companyNr = cust.nr;
						}); // Customers find
				}); // forEach context.programs
				res.render('transaction/mypoints', context);
			}); // CUSers FindById
	}, // myPoints

	toRedeem: function(req, res, next){
		CUsers.findById(req.user._id)
				.populate('finishedPrograms.program', 'programName programStatus goalCount customer')
				.exec(function(err, user){
			var context ={
				layout: 'app',
				programs: user.finishedPrograms.map(function(finishedProgram){
					return {
						programName: finishedProgram.program.programName,
						programStatus: finishedProgram.program.programStatus,
						programCustomer: finishedProgram.program.customer,
						goalCount: finishedProgram.program.goalCount,
						finishedCount: finishedProgram.finishedCount
					}
				}), // map programs
			}; // define context
			context.programs.forEach(function(program){
				Customers.findById(program.programCustomer)
					.select('nr company')
					.exec(function(err, cust){
						program.company = cust.company;
						program.companyNr = cust.nr
					}); // Customers find
			}); // forEach context.programs
			res.render('transaction/toRedeem', context);
		}); // CUSers FindById
	}, // toRedeem

	customerDetail: function(req, res, next){
		Customers.findOne( {nr: req.params.nr}, function(err, customer){
			var context = {
				layout: 'app',
				nr: customer.nr,
				company: customer.company,
				email: customer.email,
				address1: customer.address1,
				address2: customer.address2,
				zip: customer.zip,
				city: customer.city,
				phone: customer.phone
			};
			res.render('transaction/customer', context);
		}); // CustomersFind
	}, // customerDetail
};