var Programs = require('../models/programs.js');
var Reels = require('../models/reels.js');
var Customers = require('../models/customers.js');
var CUsers = require('../models/cusers.js');
var Orders = require('../models/orders.js');
var NewsFeed = require('../models/newsfeed.js');
var NewsHistory = require('../models/newshistory.js');
var RealReelCode = require('../help/RealReelCodes.json');

module.exports = {

	registerRoutes: function(app) {
		app.get('/reset', this.reset);
	}, // registerRoutes

	reset: function(req, res, next) {

		console.log('are you sure you want to reset?')
		Programs.remove({}, function(err) { 
			console.log('Programs removed');
		});
		Reels.remove({}, function(err) { 
			console.log('Reels removed');
		});
		Orders.remove({}, function(err) { 
			console.log('Orders removed');
		});
		NewsFeed.remove({}, function(err) {
			console.log('NewsFeed removed');
		});
		NewsHistory.remove({}, function(err) {
			console.log('NewsHistory removed');
		});

		var helpAA = {}, helpBB = {}, helpCC = {}, helpDD = {};
		var contextAA = [], contextBB = [], contextCC = [], contextDD = [];
		for (i=1; i<501; i++) {
			helpAA = {
				rCode: 'AA' + i,
				cStatus: 0,
			};
			contextAA.push(helpAA);
			helpBB = {
				rCode: 'BB' + i,
				cStatus: 0,
			};
			contextBB.push(helpBB);
			helpCC = {
				rCode: 'CC' + i,
				cStatus: 0,
			};
			contextCC.push(helpCC);
			helpDD = {
				rCode: RealReelCode[i -1],
				cStatus: 0,
			};
			contextDD.push(helpDD);
		}

		CUsers.findById(req.user._id, function(err, user){
			var reels = new Reels(
				{
					nr: 'R1000001',
					reelStatus: 'erfasst',
					quantityCodes: contextAA.length,
					activatedCodes: 0,
					created: new Date(),
					createdBy: user._id,
					codes: contextAA,
				} // new Reels array
			); // var reels
			reels.save(function (err) {
				if (err) {console.log('fehler' + err);}// ...
				console.log('created Reels');
			}); // reels save	
			var reels = new Reels(
				{
					nr: 'R1000002',
					reelStatus: 'erfasst',
					quantityCodes: contextBB.length,
					activatedCodes: 0,
					created: new Date(),
					createdBy: user._id,
					codes: contextBB,
				} // new Reels array
			); // var reels
			reels.save(function (err) {
			if (err) {console.log('fehler' + err);}// ...
				console.log('created Reels');
			}); // reels save
			var reels = new Reels(
				{
					nr: 'R1000003',
					reelStatus: 'erfasst',
					quantityCodes: contextCC.length,
					activatedCodes: 0,
					created: new Date(),
					createdBy: user._id,
					codes: contextCC,
				} // new Reels array
			); // var reels
			reels.save(function (err) {
				if (err) {console.log('fehler' + err);}// ...
			console.log('created Reels');
			}); // reels save
			var reels = new Reels(
				{
					nr: 'R1000004',
					reelStatus: 'erfasst',
					quantityCodes: contextCC.length,
					activatedCodes: 0,
					created: new Date(),
					createdBy: user._id,
					codes: contextDD,
				} // new Reels array
			); // var reels
			reels.save(function (err) {
				if (err) {console.log('fehler' + err);}// ...
			console.log('created Reels');
			}); // reels save
		}); // CUsers find
		CUsers.find({}, function(err, user){
			user.forEach(function(User){
				if (User.hitGoalPrograms){ 
					User.update({$set: { hitGoalPrograms: [] }}, function(err, message){
						console.log(message);
					}); // User.update
				} //if User.hitGoalPrograms
				if (User.particiPrograms){
					User.update({$set: { particiPrograms: [] }}, function(err, message){
						console.log(message);
					}); // User.update
				} //if User.particiPrograms
				if (User.redeemPrograms){
					User.update({$set: { redeemPrograms: [] }}, function(err, message){
						console.log(message);
					}); // User.update
				} //if User.particiPrograms
				if (User.finishedPrograms){
					User.update({$set: { finishedPrograms: [] }}, function(err, message){
						console.log(message);
					}); // User.update
				} //if User.particiPrograms
			}); // user.forEach
		}); //CUsers find 'all'
		res.redirect(303, '/programm');
	}, // reset

}; // module exports