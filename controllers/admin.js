var Customers = require('../models/customers.js');
var CUsers = require('../models/cusers.js');
var Programs = require('../models/programs.js');
var NewsFeed = require('../models/newsfeed.js');
var moment = require('moment');
var qplib = require('../lib/qpointlib.js');

module.exports = {
	registerRoutes: function(app) {
		app.get('/admin/kunden', qplib.adminOnly, this.clientLibrary);
		app.get('/admin/user', qplib.adminOnly, this.userLibrary);
		app.get('/admin/programme', qplib.adminOnly, this.programLibrary);
	}, // registerRoutes

	clientLibrary: function(req, res, next){
		Customers.find(function(err, customers) {
			var context = {
				customers: customers.map(function(customer){
					return {
						nr: customer.nr,
						company: customer.company,
						firstName: customer.firstName,
						lastName: customer.lastName,
						email: customer.email,
						city: customer.city,
					} // return
				}) // customers.map
			}; // context
			res.render('admin/customers', context);		
		}); // Customers.find
	}, // clientLibrary

	userLibrary: function(req, res, next){
		CUsers
			.find({})
			.populate('customer', 'company')
			.exec(function(err, users) {
			var context = {
				users: users.map(function(user){
					return {
						firstName: user.firstName,
						lastName: user.lastName,
						username: user.username,
						gender: user.gender,
						role: user.role,
						created: moment(user.created).format("DD.MM.YY"),
						company: user.customer ? user.customer.company : '',
					} // return
				}) // users map
			}; // context
			res.render('admin/user', context);
		}); // CUsers.find
	}, // userLibrary

	// Übersicht aller angelegten Programme
	programLibrary: function(req,res){
		Programs
			.find({})
			.populate('allocatedReels', 'nr')
			.populate('customer', 'company')
			.exec(function(err, programs) {
				var context = {
					programs: programs.map(function(program){
						return {
							nr: program.nr,
							programStatus: program.programStatus,
							programName: program.programName,
							company: program.customer.company,
							goalToHit: program.goalToHit,
							startDate: moment(program.startDate).format("DD.MM.YY"),
							deadlineSubmit: moment(program.deadlineSubmit).format("DD.MM.YY"),
							// deadlineScan: moment(program.deadlineScan).format("DD.MM.YY HH:mm"),
							allocatedReels: program.allocatedReels.map(function(reel){
								return {nr: reel.nr}
							}), // allocatedReels.map
							customer: program.customer,
						} // return for programs map
					}) // programs map
				}; // context
				res.render('admin/programs', context);
		}); // Programs.find
	}, // programLibrary

}; // module.exports	