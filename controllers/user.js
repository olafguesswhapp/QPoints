var User = require('../models/user.js');
var Customer = require('../models/customer.js');
var passport = require('passport');
var moment = require('moment');
// var passport = require('passport');

function customerOnly(req, res, next) {
	if (Object.keys(req.session.passport).length > 0) {
		User.findById(req.session.passport.user, function(err, user){
			if(user.role==='customer' || user.role==='admin') return next();
		});
	} else { res.redirect('/login'); }
};

module.exports = {

	registerRoutes: function(app) {
		app.get('/user/anlegen', customerOnly, this.userRegister);
		app.post('/user/anlegen', customerOnly, this.processUserRegister);

		app.get('/user', customerOnly, this.userLibrary);

		app.get('/login', this.login);
		app.post('/login', this.processLogin);
		app.get('/logout', this.logout);
	},

	// Neuen User anlegen - Voraussetzung = als Kunde angemeldet
	userRegister: function(req, res, next){
		if (!req.user) return next();
		if (req.user.role != 'customer' && req.user.role != 'admin') return next();
		Customer.findById(req.user.customer, function(err, customer){
			var context = {
				actualCustomerId: customer._id,
				customerCompany: customer.company,
				actualUserName: req.user.username,
				customerName: customer.firstName + " " + customer.lastName,
			};
		res.render('user/register', context);
		});		
	},

	processUserRegister: function(req, res, next){
		var u = new User({
			username: req.body.username,
			password: req.body.password,
			customer: req.body.customer,
			created: moment(new Date()).format('YYYY-MM-DDTHH:mm'),
			firstName: req.body.firstName,
			lastName: req.body.lastName,
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
						firstName: user.firstName,
						lastName: user.lastName,
						username: user.username,
						role: user.role,
						created: moment(user.created).format("DD.MM.YY"),
					}
				})
			};
			Customer.findById(req.user.customer, function(err, customer){
				context.customerNr = customer.nr;
				context.customerCompany = customer.company;
				res.render('user/library', context);
			});
		});
	},

	login: function(req, res){
		res.render('user/login', { user: req.user, message: req.session.messages });
	},

	processLogin: function(req, res, next) {
		passport.authenticate('local', function(err, user, info) {
			if (err) { return next(err) }
			if (!user) {
				req.session.flash = {
					type: 'Warnung',
					intro: 'Hinweis: ',
					message: 'Der Username ' + req.body.username + ' wurde bisher nicht angelegt. Bitte diesen als Kunde neu anmelden oder als User eines Kunden anlegen lassen.',
					};
				return res.redirect('/kunden/anmelden');
			}
			req.logIn(user, function(err) {
				if (err) { return next(err); }
				req.session.flash = {
					type: 'Erfolg',
					intro: 'Willkommen!',
					message: 'Du bist richtig eingelogged.',
					};	
				if (!(JSON.stringify(user._id) == JSON.stringify(req.session.cart.user))) {
				req.session.cart = { items: [], total: 0}; 
				}
				return res.redirect('/');
			});
		})(req, res, next);
	},

	logout: function(req, res){
		req.logout();
		res.redirect('/');
	},

};