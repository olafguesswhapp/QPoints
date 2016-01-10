var Customers = require('../models/customers.js');
var CUsers = require('../models/cusers.js');
var moment = require('moment');
var qplib = require('../lib/qpointlib.js');

function noCustomerMessage (req, res, next) {
	res.locals.flash = {
		type: 'danger',
		intro: 'Sie haben keinen Zugriffsrechte bzw. es gibt nicht den Kunden ',
		message: ' mit der Kunden-Nr ' + req.params.nr,
	};
	res.render('customer/detail');
}; // noCustomerMessage

module.exports = {

	registerRoutes: function(app) {
		app.get('/anmelden', this.register);
		app.post('/anmelden', this.processRegister);
		app.get('/kunde', qplib.checkUserRole8above, this.clientPrep);
		app.get('/kunden/:nr', qplib.checkUserRole8above, this.detail);
		app.get('/kunden/edit/:nr', qplib.checkUserRole8above, this.editCustomer);
		app.post('/kunden/edit/:nr', qplib.checkUserRole8above, this.processEditCustomer);
	},

	register: function(req, res, next) {
		Customers.findOne({}, {}, {sort: {'nr' : -1}}, function(err, customer){
			var context = !customer ? {neueNr : 'K10001'} : 
				{neueNr : customer.nr.match(/\D+/)[0] + (parseInt(customer.nr.match(/\d+/))+1),};
			res.render('customer/register', context);
		});	
	},

	processRegister: function(req, res, next) { // TODO: back-end validation (safety)
		var u = new CUsers({
			username: req.body.email,
			password: req.body.password,
			created: moment(new Date()).format('YYYY-MM-DDTHH:mm'),
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			role: 'customer',
		});
		u.save(function(err, newUser){
			if(err) {
				req.session.flash = {
					type: 'danger',
					intro: 'Der Username "' + err.errors.username.value + '" muss einmalig sein.',
					message: err.errors.username.message,
				};
				res.redirect(303, '/anmelden');
			} else {
				var c = new Customers({
					nr: req.body.nr,
					company: req.body.company,
					firstName: req.body.firstName,
					lastName: req.body.lastName,
					email: req.body.email,
					address1: req.body.address1,
					address2: req.body.address2,
					city: req.body.city,
					state: req.body.state,
					zip: req.body.zip,
					phone: req.body.phone,
					user: newUser._id,
				}); // var c =
				c.save(function(err, newCustomer){
					if(err) {
						return next(err);
					} else {
					newUser.customer = newCustomer._id;
					newUser.save();
					res.redirect(303, '/programm');					
					} // else
				}); // c.save
			} // else
		}); // u.save
	},

	clientPrep: function(req, res, next){
		CUsers
			.findOne({username: res.locals.loggedInUsername})
			.populate('customer', 'nr')
			.select('customer')
			.exec(function(err, user){
				console.log(user);
				if (err || !user){
					res.redirect(303, '/user');
				} else {
					res.redirect(303, '/kunden/' + user.customer.nr);
				}
			}); // CUsers.FindOne
	}, // clientPrep

	detail: function(req, res, next) {
		Customers.findOne({ nr : req.params.nr })
				// .where({ user: req.user._id})
				.populate('user', '_id username')
				.exec(function(err, customer) {
			console.log('_id found in Obj? ' + customer.user.filter(function(userObj){return JSON.stringify(userObj._id) == JSON.stringify(req.user._id);}).length);
			if(err || !customer) {
				console.log(err);
				noCustomerMessage(req, res, next);
				return;
			} else if (res.locals.roleLevel < 10 && customer.user.filter(function(userObj){return JSON.stringify(userObj._id) == JSON.stringify(req.user._id);}).length == 0) {
				console.log('User not allowed - ' + req.user._id + ' ' + res.locals.roleLevel+ ' ' + customer.user._id);
				noCustomerMessage(req, res, next);
			} else {
				CUsers.find({}, function(err, users){
					var context = {
						nr: customer.nr,
						company: customer.company,
						firstName: customer.firstName,
						lastName: customer.lastName,
						email: customer.email,
						address1: customer.address1,
						address2: customer.address2,
						zip: customer.zip,
						city: customer.city,
						state: customer.state,
						phone: customer.phone,
						user: customer.user.map(function(user){
							return { 
								username: user.username,
								firstName: user.firstName,
								lastName: user.lastName,
								role: user.role,
							} // return
						}), // customer.user.map
					}; // context
				res.render('customer/detail', context);	
				}); // CUsers.find
			} // else if
		}); // Customers.findOne
	}, // detail

	editCustomer: function (req, res, next) {
		Customers.findOne({ nr : req.params.nr })
				.where({ user: req.user._id})
				.exec(function(err, customer) {
			if(err || !customer) {
				noCustomerMessage(req, res, next);
				return;
			} else {
				CUsers.find({}, function(err, users){
					var context = {
						customerId: customer._id,
						nr: customer.nr,
						company: customer.company,
						firstName: customer.firstName,
						lastName: customer.lastName,
						email: customer.email,
						address1: customer.address1,
						address2: customer.address2,
						zip: customer.zip,
						city: customer.city,
						state: customer.state,
						phone: customer.phone,
					}; // context
				res.render('customer/edit', context);	
				}); // CUSers.find
			} // else
		}); // Customers.findOne
	}, // editCustomer

	processEditCustomer: function(req, res, next) {
		Customers
				.findById(req.body.customerId)
				.where({ user: req.user._id})
				.exec(function(err, customer){
			if(err || !customer) {
				noCustomerMessage(req, res, next);
				return;
			} else {
				customer.company = req.body.company;
				customer.address1 = req.body.address1;
				customer.address2 = req.body.address2;
				customer.city = req.body.city;
				customer.state = req.body.state;
				customer.zip = req.body.zip;
				customer.phone = req.body.phone;
				customer.user = req.user._id;
				customer.save(function(err, updatedCustomer) {
	        if(err) return next(err);
		      res.redirect(303, '/kunden/' + req.body.nr);
	      }); // customer.save
			} // else
		}); // Customers.findById
	} // processEditCustomer

};