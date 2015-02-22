var Programs = require('../models/programs.js');
var Reels = require('../models/reels.js');
var Customers = require('../models/customers.js');
var CUsers = require('../models/cusers.js');
var Orders = require('../models/orders.js');

module.exports = {

	registerRoutes: function(app) {
		app.get('/reset', this.reset);
	}, // registerRoutes

	reset: function(req, res, next) {
		console.log('are you sure you want to reset?')
		Programs.remove({}, function(err) { 
			console.log('Programs removed')
		});
		Reels.remove({}, function(err) { 
			console.log('Reels removed')
		});
		Orders.remove({}, function(err) { 
			console.log('Orders removed')
		});

		CUsers.findById(req.user._id, function(err, user){
			var reels = new Reels(
				{
					nr: 'R1000001',
					reelStatus: 'erfasst',
					quantityCodes: 5,
					activatedCodes: 0,
					created: new Date(),
					createdBy: user._id,
					codes: [
						{rCode: 'AA1', cStatus: '0'},
						{rCode: 'AA2', cStatus: '0'},
						{rCode: 'AA3', cStatus: '0'},
						{rCode: 'AA4', cStatus: '0'},
						{rCode: 'AA5', cStatus: '0'},
						// {rCode: 'AA6', cStatus: '0'},
						// {rCode: 'AA7', cStatus: '0'},
						// {rCode: 'AA8', cStatus: '0'},
						// {rCode: 'AA9', cStatus: '0'},
						// {rCode: 'AA10', cStatus: '0'},
						// {rCode: 'AA11', cStatus: '0'},
						// {rCode: 'AA12', cStatus: '0'},
						// {rCode: 'AA13', cStatus: '0'},
						// {rCode: 'AA14', cStatus: '0'},
						// {rCode: 'AA15', cStatus: '0'},
						// {rCode: 'AA16', cStatus: '0'},
						// {rCode: 'AA17', cStatus: '0'},
						// {rCode: 'AA18', cStatus: '0'},
						// {rCode: 'AA19', cStatus: '0'},
						// {rCode: 'AA20', cStatus: '0'}
					],
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
					quantityCodes: 5,
					activatedCodes: 0,
					created: new Date(),
					createdBy: user._id,
					codes: [
						{rCode: 'AB1', cStatus: '0'},
						{rCode: 'AB2', cStatus: '0'},
						{rCode: 'AB3', cStatus: '0'},
						{rCode: 'AB4', cStatus: '0'},
						{rCode: 'AB5', cStatus: '0'},
						// {rCode: 'AB6', cStatus: '0'},
						// {rCode: 'AB7', cStatus: '0'},
						// {rCode: 'AB8', cStatus: '0'},
						// {rCode: 'AB9', cStatus: '0'},
						// {rCode: 'AB10', cStatus: '0'},
						// {rCode: 'AB11', cStatus: '0'},
						// {rCode: 'AB12', cStatus: '0'},
						// {rCode: 'AB13', cStatus: '0'},
						// {rCode: 'AB14', cStatus: '0'},
						// {rCode: 'AB15', cStatus: '0'},
						// {rCode: 'AB16', cStatus: '0'},
						// {rCode: 'AB17', cStatus: '0'},
						// {rCode: 'AB18', cStatus: '0'},
						// {rCode: 'AB19', cStatus: '0'},
						// {rCode: 'AB20', cStatus: '0'}
					],
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
					quantityCodes: 5,
					activatedCodes: 0,
					created: new Date(),
					createdBy: user._id,
					codes: [
						{rCode: 'AC1', cStatus: '0'},
						{rCode: 'AC2', cStatus: '0'},
						{rCode: 'AC3', cStatus: '0'},
						{rCode: 'AC4', cStatus: '0'},
						{rCode: 'AC5', cStatus: '0'},
						// {rCode: 'AC6', cStatus: '0'},
						// {rCode: 'AC7', cStatus: '0'},
						// {rCode: 'AC8', cStatus: '0'},
						// {rCode: 'AC9', cStatus: '0'},
						// {rCode: 'AC10', cStatus: '0'},
						// {rCode: 'AC11', cStatus: '0'},
						// {rCode: 'AC12', cStatus: '0'},
						// {rCode: 'AC13', cStatus: '0'},
						// {rCode: 'AC14', cStatus: '0'},
						// {rCode: 'AC15', cStatus: '0'},
						// {rCode: 'AC16', cStatus: '0'},
						// {rCode: 'AC17', cStatus: '0'},
						// {rCode: 'AC18', cStatus: '0'},
						// {rCode: 'AC19', cStatus: '0'},
						// {rCode: 'AC20', cStatus: '0'}
					],
				} // new Reels array
			); // var reels
			reels.save(function (err) {
				if (err) {console.log('fehler' + err);}// ...
				console.log('created Reels');
			}); // reels save
		}); // CUsers find
		res.redirect(303, '/programm');
	}, // reset

}; // module exports