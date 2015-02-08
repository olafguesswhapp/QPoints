var User = require('../models/user.js');
var Customer = require('../models/customer.js');
var moment = require('moment');
// var passport = require('passport');

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
};

module.exports = {

	registerRoutes: function(app) {
		app.get('/user/anlegen', this.userRegister);
		app.post('/user/anlegen', this.processUserRegister);

		app.get('/user', ensureAuthenticated, this.userLibrary);

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
			if(err) return next(err);
			Customer.findById(req.body.customer, function(err, customer){
				console.log('der neue User ' + newUser);
				customer.user.push(newUser._id);
				customer.save();				
			});
			res.redirect(303, '/user');
		});
	},

	userLibrary: function(req, res, next){
		if (req.user.role != 'customer' && req.user.role != 'admin') return next();
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