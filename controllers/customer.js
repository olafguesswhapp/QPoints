var Customers = require('../models/customers.js');
var customerViewModel = require('../viewModels/customer.js');
var CUsers = require('../models/cusers.js');
var moment = require('moment');
var qplib = require('../lib/qpointlib.js');


module.exports = {

	registerRoutes: function(app) {
		app.get('/anmelden', this.register);
		app.post('/anmelden', this.processRegister);
		app.get('/kunden', qplib.adminOnly, this.clientList);
		app.get('/kunde', qplib.checkUserRole8above, this.clientPrep);
		app.get('/kunden/:nr', this.detail);
		app.get('/kunden/edit/:nr', this.editCustomer);
		app.post('/kunden/edit/:nr', this.processEditCustomer);
	},

	register: function(req, res, next) {
		Customers.findOne({}, {}, {sort: {'nr' : -1}}, function(err, customer){
			if (!customer) {
				var context = {neueNr : 'K10001'};
			} else {
				var context = {neueNr : customer.nr.match(/\D+/)[0] + (parseInt(customer.nr.match(/\d+/))+1),};
			}
			res.render('customer/register', context);
		});	
	},

	processRegister: function(req, res, next) {
		// TODO: back-end validation (safety)
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
					type: 'Warnung',
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
				});
				c.save(function(err, newCustomer){
					if(err) {
						return next(err);
					} else {
					newUser.customer = newCustomer._id;
					newUser.save();
					res.redirect(303, '/kunden');					
					}
				});
			}
		});

	},

	clientList: function(req, res, next){
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
					}
				})
			};
			res.render('customer/customers', context);		
		})
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
				.populate('user')
				.exec(function(err, customer) {
			if(err) return next(err);
			if(!customer) return next(); 	// pass this on to 404 handler
			CUsers.find({}, function(err, users){
				var context = {
					navAccount: 'class="active"',
					current: 'client',
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
						}
					}),
				};
			res.render('customer/detail', context);	
			});
		});
	}, // detail

	editCustomer: function (req, res, next) {
		Customers.findOne({ nr : req.params.nr })
				.exec(function(err, customer) {
			if(err) return next(err);
			if(!customer) return next(); 	// pass this on to 404 handler
			CUsers.find({}, function(err, users){
				var context = {
					navAccount: 'class="active"',
					current: 'client',
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
			});
		});
	}, // editCustomer

	processEditCustomer: function(req, res, next) {
		Customers.findById(req.body.customerId, function(err, customer){
			customer.company = req.body.company;
			customer.address1 = req.body.address1;
			customer.address2 = req.body.address2;
			customer.city = req.body.city;
			customer.state = req.body.state;
			customer.zip = req.body.zip;
			customer.phone = req.body.phone;
			customer.user = req.user._id;
			console.log(customer);
			customer.save(function(err, updatedCustomer) {
                if(err) return next(err);
	            res.redirect(303, '/kunden/' + req.body.nr);
            }); // customer.save
		}); // Customers.findById
	}, // processEditCustomer
};