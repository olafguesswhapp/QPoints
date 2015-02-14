var Customers = require('../models/customers.js');
var customerViewModel = require('../viewModels/customer.js');
var CUsers = require('../models/cusers.js');
var moment = require('moment');


module.exports = {

	registerRoutes: function(app) {
		app.get('/anmelden', this.register);
		app.post('/anmelden', this.processRegister);

		app.get('/kunden', this.clientList);
		app.get('/kunden/:nr', this.detail);
		app.get('/orders/:id', this.orders);
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

	detail: function(req, res, next) {
		Customers.findOne({ nr : req.params.nr })
				.populate('user')
				.exec(function(err, customer) {
			if(err) return next(err);
			if(!customer) return next(); 	// pass this on to 404 handler
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
						}
					}),
				};
			res.render('customer/detail', context);	
			});
		});
	},

	orders: function(req, res, next) {
		Customers.find({ nr : req.params.nr }, function(err, customer) {
			if(err) return next(err);
			if(!customer) return next(); 	// pass this on to 404 handler
			customer.getOrders(function(err, orders) {
				if(err) return next(err);
				res.render('customer/preferences', customerViewModel(customer, orders));
			});
		});
	},

	ajaxUpdate: function(req, res) {
		Customers.findById(req.params.id, function(err, customer) {
			if(err) return next(err);
			if(!customer) return next(); 	// pass this on to 404 handler
			if(req.body.firstName){
				if(typeof req.body.firstName !== 'string' ||
					req.body.firstName.trim() === '')
					return res.json({ error: 'Invalid name.'});
				customer.firstName = req.body.firstName;
			}
			// and so on....
			customer.save(function(err) {
				return err ? res.json({ error: 'Unable to update customer.' }) : res.json({ success: true });
			});
		});
	},
};