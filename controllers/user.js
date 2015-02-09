var User = require('../models/user.js');
var Customer = require('../models/customer.js');
var moment = require('moment');
// var passport = require('passport');

function customerOnly(req, res, next) {
	if (Object.keys(req.session.passport).length > 0) {
		User.findById(req.session.passport.user, function(err, user){
			if(user.role==='customer') return next();
		});
	} else { next('route'); }
};

module.exports = {

	registerRoutes: function(app) {
		app.get('/user/anlegen', customerOnly, this.userRegister);
		app.post('/user/anlegen', customerOnly, this.processUserRegister);

		app.get('/user', customerOnly, this.userLibrary);
	},

	// Neuen User anlegen - Voraussetzung = als Kunde angemeldet
	userRegister: function(req, res, next){
		if (!req.user) return next();
		if (req.user.role != 'customer' && req.user.role != 'admin') return next();
		Customer.findById(req.user.customer, function(err, customer){
			var context = {
				actualCustomerId: customer._id,
				actualFirma: req.user.firma,
				actualUserName: req.user.username,
				customerName: customer.firstName + " " + customer.lastName,
			};
		console.log('diese KundenID wird ins register template geliefert ' + context.actualCustomerId);
		res.render('user/register', context);
		});		
	},

	processUserRegister: function(req, res, next){
		console.log('stimmt die CustomerID ' + req.body.actualCustomerId);
		var u = new User({
			username: req.body.username,
			password: req.body.password,
			customer: req.body.customer,
			created: moment(new Date()).format('YYYY-MM-DDTHH:mm'),
			name: req.body.firstName + ' ' + req.body.lastName,
			role: 'user',
		});
		u.save(function(err, newUser){
			if(err) {
				req.session.flash = {
					type: 'Warnung',
					intro: 'Der Username "' + err.errors.username.value + '" muss einmalig sein.',
					message: err.errors.username.message,
				};
				res.redirect(303, 'user/anlegen');
			} else {
				Customer.findById(req.body.customer, function(err, customer){
					customer.user.push(newUser._id);
					customer.save();				
				});
			}
		});
	},

	userLibrary: function(req, res, next){
		if (!req.user) return next();
		User.find({ customer : req.user.customer}, function(err, users) {
			var context = {
				users: users.map(function(user){
					return {
						name: user.name,
						username: user.username,
						role: user.role,
						created: user.created,
					}
				})
			};
			Customer.findById(req.user.customer, function(err, customer){
				context.customerNr = customer.nr;
				context.customerFirma = customer.firma;
			});
			res.render('user/library', context);
		});
	},

};