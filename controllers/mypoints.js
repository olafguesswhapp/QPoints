var CUsers = require('../models/cusers.js');
var Reels = require('../models/reels.js');
var Programs = require('../models/programs.js');
var Customers = require('../models/customers.js');
var NewsFeed = require('../models/newsfeed.js');
var NewsHistory = require('../models/newshistory.js');
var moment = require('moment');
var qplib = require('../lib/qpointlib.js');

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
		app.get('/meinepunkte/scan', LoggedInUserOnly, this.scan);
		app.post('/meinepunkte/scan', this.processScan);
		app.get('/meinepunkte', LoggedInUserOnly, this.myPoints);
		app.get('/meinepunkte/news', LoggedInUserOnly, this.news);
		app.get('/einzuloesen', this.toRedeem);
		app.get('/firma/:nr', this.customerDetail);
		app.get('/program/:nr', this.programDetail);
	},

	scan: function(req, res, next){
		CUsers.findById(req.user._id, function(err, user){
			var context = { 
				name: user.firstName + ' ' + user.lastName
			};
			res.render('transaction/scan', context);
		}); // CUsers find
	},

	processScan: function(req, res, next){
		Reels.findOne({'codes.rCode' : req.body.qpInput})
					.populate('assignedProgram', '_id programName startDate deadlineSubmit goalToHit')
					.exec(function(err, reel){
			if(err) {
				req.session.flash = {
					type: 'Warnung',
					intro: 'Leider ist ein Fehler aufgetreten.',
					message: err,
				};
				res.redirect(303, '/meinepunkte/scan');
			} // if err
			if (!reel) {
				req.session.flash = {
					type: 'Warnung',
					intro: 'Dieser QPoint ist nicht vorhanden',
					message: req.qpInput,
				};
				res.redirect(303, '/meinepunkte/scan');
			} else {// if !reel
				// gefunden
				if (reel.reelStatus == "aktiviert"){
					if(new Date()<= reel.assignedProgram.deadlineSubmit){
						reel.codes.forEach(function(code){
							if (code.rCode == req.body.qpInput){
								if(code.cStatus=='0'){
									var qpMessage = 'QPoint ' + code.rCode  + ' Rolle ' + reel.nr;	
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
									qplib.updateUserStats(req.user._id, reel.assignedProgram._id, reel.assignedProgram.goalToHit);
									res.redirect(303, '/meinepunkte/scan');
								} else { // if cStatus = 0
									var qpMessage = 'QPoint ' + code.rCode + ' Status ' 
										+ code.cStatus + ' Rolle ' + reel.nr;	
									req.session.flash = {
										type: 'Warnung',
										intro: 'Der QPoint wurde bereits verwendet',
										message: qpMessage,
									};
									res.redirect(303, '/meinepunkte/scan');
								} // if cStatus not 0
							} // if qpInput
						}); // reel.codes forEach	
				} else { // if Dates
					req.session.flash = {
						type: 'Warnung',
						intro: 'Das Programm ist bereits abgelaufen',
						message: 'Die Rolle ist damit nicht mehr gültig',
					};
					res.redirect(303, '/meinepunkte/scan');
				} // else if Dates
				} else {// if reel = aktiviert
				req.session.flash = {
					type: 'Warnung',
					intro: 'Der QPoint wurde noch nicht einem Programm zugeordnet',
					message: 'Bitte wenden Sie sich an den Ladeninhaber',
				};
				res.redirect(303, '/meinepunkte/scan');
				} // if else reels nicht aktiviert
			} // if else = reels gefunden
		}); // Reels find
	}, // processCodeRequest

	myPoints: function(req, res, next){
		CUsers
			.findById(req.user._id)
			.populate('particiPrograms.program', 'nr programName programStatus goalToHit customer')
			.exec(function(err, user){
			if (typeof user.particiPrograms === 'undefined'){ // if user has not yet collected any code
				var context = {
					programs: {},
				};
			} else { // user already has collected one or more codes
				var context ={
					programs: user.particiPrograms.map(function(partiProgram){
						return {
							nr: partiProgram.program.nr,
							programName: partiProgram.program.programName,
							programStatus: partiProgram.program.programStatus,
							programCustomer: partiProgram.program.customer,
							goalToHit: partiProgram.program.goalToHit,
							countPoints: partiProgram.countPoints,
							countToRedeem: partiProgram.countToRedeem,
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
			} // else check whether user has already collected a code
			console.log(context);
			res.render('transaction/mypoints', context);
		}); // CUSers FindById
	}, // myPoints

	toRedeem: function(req, res, next){
		CUsers
			.findById(req.user._id)
			.populate('particiPrograms.program', 'nr programName programStatus goalToHit customer')
			.exec(function(err, user){
			var context ={
				programs: [{}]
			}; // define context
			var help;
			var indexP = 0;
			user.particiPrograms.forEach(function(program){
				if (program.countToRedeem > 0) {
					help = {
						nr: program.program.nr,
						programName: program.program.programName,
						programStatus: program.program.programStatus,
						programCustomer: program.program.customer,
						goalToHit: program.program.goalToHit,
						countToRedeem: program.countToRedeem
					};
					context.programs[indexP] = help;
					indexP++;
				}
			}); // user.particiPrograms.forEach

			context.programs.forEach(function(program, indexPP){
				Customers
					.findById(program.programCustomer)
					.select('nr company')
					.exec(function(err, cust){
						program.company = cust.company;
						program.companyNr = cust.nr
					}); // Customers find
				if (indexPP == context.programs.length - 1) {
					res.render('transaction/toRedeem', context);
				}
			}); // forEach context.programs
		}); // CUSers FindById
	}, // toRedeem

	customerDetail: function(req, res, next){
		Customers.findOne( {nr: req.params.nr}, function(err, customer){
			var context = {
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

	programDetail: function(req, res, next){
		Programs.findOne({ nr : req.params.nr }, function(err, program){
			var context = {
				nr: program.nr,
				programStatus: program.programStatus,
				programName: program.programName,
				goalToHit: program.goalToHit,
				startDate: moment(program.startDate).format("DD.MM.YY HH:mm"),
				deadlineSubmit: moment(program.deadlineSubmit).format("DD.MM.YY HH:mm"),
				// deadlineScan: moment(program.deadlineScan).format("DD.MM.YY HH:mm"),
			}; // context
			res.render('transaction/program', context);

		}); // ProgramsFindOne
	}, // programDetail

	news: function(req, res, next){
		var programData=[];
		CUsers
			.findById(req.user._id)
			.populate({
				path: 'particiPrograms.program',
				match: { programStatus: 'aktiviert'},
				select: '_id'
				})
			.select('particiPrograms.program')
			.exec(function(err, checkUser){
			console.log('checkUser1');
			console.log(checkUser);
			if (err || !checkUser || checkUser.particiPrograms.length == 0) {
				console.log('keinen User gefunden');
			} else {
				console.log('else');
				for (var i=0; i<checkUser.particiPrograms.length; i++) {
					if (checkUser.particiPrograms[i].program) {
						programData.push(checkUser.particiPrograms[i].program._id);
					} // if
				} // for i
				console.log('programData');
				console.log(programData);
				NewsFeed
					.find({'assignedProgram': { $in: programData}})
		            .where('newsStatus').equals('erstellt')
		            .$where('this.newsDeliveryLimit > this.newsDeliveryCount')
		            .where('newsDeadline').gt(new Date()) // Change to "new Date (2016,1,1)" to test
		            .populate('customer', 'company')
		            .populate('assignedProgram', 'programName')
		            .exec(function(err, newsFeed){
			        var context = {
			        	news: []
			        };
			        var help = {};
			        if (err || newsFeed.length == 0) {
			            context = {
			                success: false,
			                message: 'Es liegen keine Nachrichten vor',
			            };
			            statusCode = 400;
			            console.log(context);
			        } else {// if
			            //Check if News was already sent
			            newsFeed.forEach(function(newsfeed, indexN){
			                console.log(newsfeed._id);
			                NewsHistory.find({'newsFeed' : newsfeed._id})
			                            .where({'receivedBy' : res.locals.apiuser })
			                            .select('_id')
			                            .exec(function(err, newshistory){
			                    if (newshistory.length == 0) {// has not been send
			                        // collect News Data to send to User
			                        help = {
			                            newsTitle: newsfeed.newsTitle,
			                            newsMessage: newsfeed.newsMessage,
			                            programName: newsfeed.assignedProgram.programName,
			                            company: newsfeed.customer.company,
			                            newsDate: moment(new Date()).format('YYYY-MM-DD'),
			                        };
			                        context.news.push(help);
			                        // register news Push to newsHistory data feed
			                        newHistory = new NewsHistory ({
			                            newsFeed: newsfeed._id,
			                            receivedBy: res.locals.apiuser,
			                            customer: newsfeed.customer._id,
			                            assignedProgram: newsfeed.assignedProgram._id,
			                            sendDate: new Date(),
			                        });
			                        // newHistory.save(function(err, newhistory) {
			                        //     if(err) return next(err);
			                        // });
			                        // qplib.updateNewsFeedStats(newsfeed._id);
			                    } // if
			                    // if last forEach.loop than finish API with response
			                    if (indexN == newsFeed.length - 1) {
			                        console.log(context);
			                        if (context.length == 0) {
			                            context = {
			                                success: false,
			                                message: 'Es liegen keine Nachrichten vor',
			                            };
			                            console.log(context);
			                            res.render('transaction/news', context);
			                        } else {
			                            context = {
			                                success: true,
			                                message: 'hat geklappt',
			                                news: context.news
			                            };
			                            console.log(context);
			                            res.render('transaction/news', context);
			                        } // context is not empty
			                    } // if
			                }); // NewsHistory.findById
			            }); // newsFeed.forEach
			        } // else
			    }); // NewsFeed.Find

			} // else checkUser has content
		}); // CUsers.findById
		// Find News relating to the Programs
	}, // news
};