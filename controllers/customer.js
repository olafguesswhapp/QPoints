var Customer = require('../models/customer.js');
var customerViewModel = require('../viewModels/customer.js');

module.exports = {

	registerRoutes: function(app) {
		app.get('/kunden/anmelden', this.register);
		app.post('/kunden/anmelden', this.processRegister);

		app.get('/kunden', this.clientList);
		app.get('/kunden/:nr', this.detail);
		app.get('/orders/:id', this.orders);

	},

	register: function(req, res, next) {
		res.render('kunden/register');
	},

	processRegister: function(req, res, next) {
		// TODO: back-end validation (safety)
		var c = new Customer({
			nr: req.body.nr,
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			email: req.body.email,
			address1: req.body.address1,
			address2: req.body.address2,
			city: req.body.city,
			state: req.body.state,
			zip: req.body.zip,
			phone: req.body.phone,
		});
		c.save(function(err) {
			if(err) return next(err);
			res.redirect(303, '/kunden');
		});
	},

	clientList: function(req, res, next){
		Customer.find(function(err, customers) {
			var context = {
				customers: customers.map(function(customer){
					return {
						nr: customer.nr,
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
		Customer.find({ nr : req.params.nr }, function(err, customer) {
			if(err) return next(err);
			if(!customer) return next(); 	// pass this on to 404 handler
			res.render('customer/detail', customer[0]);
		});
	},

	preferences: function(req, res, next) {
		Customer.find({ nr : req.params.nr }, function(err, customer) {
			if(err) return next(err);
			if(!customer) return next(); 	// pass this on to 404 handler
			customer.getOrders(function(err, orders) {
				if(err) return next(err);
				res.render('customer/preferences', customerViewModel(customer, orders));
			});
		});
	},

	orders: function(req, res, next) {
		Customer.find({ nr : req.params.nr }, function(err, customer) {
			if(err) return next(err);
			if(!customer) return next(); 	// pass this on to 404 handler
			customer.getOrders(function(err, orders) {
				if(err) return next(err);
				res.render('customer/preferences', customerViewModel(customer, orders));
			});
		});
	},

	ajaxUpdate: function(req, res) {
		Customer.findById(req.params.id, function(err, customer) {
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