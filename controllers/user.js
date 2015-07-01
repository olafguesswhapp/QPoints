var CUsers = require('../models/cusers.js');
var Customers = require('../models/customers.js');
var passport = require('passport');
var moment = require('moment');
// var passport = require('passport');

function customerOnly(req, res, next) {
	if (Object.keys(req.session.passport).length > 0) {
		CUsers
			.findById(req.session.passport.user)
			.select('role')
			.exec(function(err, user){
			if(user.role==='customer' || user.role==='admin') {
				return next();
			} else {
				req.session.flash = {
                    type: 'Warnung',
                    intro: 'Sie haben nicht das Recht User anzulegen .',
                    message: 'Bitte wenden Sie sich an unsere Administration.'
                };
                res.redirect('/user');
			}
		});
	} else { res.redirect('/login'); }
};

function checkUserRole (req, res, next) {
	if (Object.keys(req.session.passport).length > 0) {
		CUsers
			.findById(req.user._id)
			.select('username role')
			.exec(function(err, user){
				if(user.role==='customer' || user.role==='admin') {
					return next();
				} else if (user.role == 'user' || user.role == 'consumer') {
					if (req.params.username == user.username) {
						return next();
					} else {
						req.session.flash = {
				            type: 'Warnung',
				            intro: 'Sie dürfe nur auf Ihre eigenen User Daten zugreifen.',
				            message: ''
				        };
				        res.redirect('/user/' + user.username);
					} // else
				} else { // else if 
					console.log('hm irgendwas stimmt nicht CHECK CHECK CHECK');
					res.redirect('/user');
				} // else if 
			}); // CUsers.findById
	} else {
		req.session.flash = {
            type: 'Warnung',
            intro: 'Sie müssen bitte als User eingelogged sein.',
            message: 'Bitte melden Sie sich mit Ihrem Email und Passwort an.'
        };
        res.redirect('/login');
    }
}; // checkUserRole

module.exports = {

	registerRoutes: function(app) {
		app.get('/user/anlegen', customerOnly, this.userRegister);
		app.post('/user/anlegen', customerOnly, this.processUserRegister);
		app.get('/user/:username', checkUserRole, this.userDetail);
		app.get('/user/edit/:username', checkUserRole, this.userEdit);
		app.post('/user/edit/:username', checkUserRole, this.processUserEdit);
		app.get('/user', checkUserRole, this.userLibrary);
		app.get('/login', this.login);
		app.post('/login', this.processLogin);
		app.get('/logout', this.logout);
	},

	// Neuen User anlegen - Voraussetzung = als Kunde angemeldet
	userRegister: function(req, res, next){
		if (!req.user) return next();
		if (req.user.role != 'customer' && req.user.role != 'admin') return next();
		Customers.findById(req.user.customer, function(err, customer){
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
		var u = new CUsers ({
			username: req.body.username,
			password: req.body.password,
			customer: req.body.customer,
			created: moment(new Date()).format('YYYY-MM-DDTHH:mm'),
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			gender: req.body.gender,
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
				Customers.findById(req.body.customer, function(err, customer){
					customer.user.push(newUser._id);
					customer.save();				
				});
				res.redirect(303, '/user');
			}
		});
	},

	userLibrary: function(req, res, next){
		if (!req.user) return next();
		CUsers.find({ customer : req.user.customer}, function(err, users) {
			var context = {
				users: users.map(function(user){
					return {
						firstName: user.firstName,
						lastName: user.lastName,
						username: user.username,
						gender: user.gender,
						role: user.role,
						created: moment(user.created).format("DD.MM.YY"),
					} // return
				}) // users
			}; // context
			Customers.findById(req.user.customer, function(err, customer){
				context.customerNr = customer.nr;
				context.customerCompany = customer.company;
				res.render('user/library', context);
			});
		});
	},

	login: function(req, res){
		if (req.session.lastPage==''){
			req.session.lastPage = req.header('Referer').slice(3+req.headers.host.length + req.protocol.length);
			if (req.session.lastPage=='/login'){req.session.lastPage='/';}
		} // end if check whether req.lastPage = ''
		res.render('user/login', { user: req.user, message: req.session.messages });
	},

	processLogin: function(req, res, next) {
		passport.authenticate('local', function(err, user, info) {
			console.log(err);
			console.log(info);
			if (err) { return next(err) }
			if (!user && info.message == 'Invalid password'){
				console.log('falsche Passwort');
				req.session.flash = {
					type: 'Warnung',
					intro: 'Hinweis: ',
					message: 'Das Passwort für Username ' + req.body.username + ' stimmt nicht - Bitte versuchen Sie es erneut.',
					};
				return res.redirect('/login');
			} else if (!user) {
				req.session.flash = {
					type: 'Warnung',
					intro: 'Hinweis: ',
					message: 'Der Username ' + req.body.username + ' wurde bisher nicht angelegt. Bitte diesen als Kunde neu anmelden oder als User eines Kunden anlegen lassen.',
					};
				return res.redirect('/anmelden');
			}
			req.logIn(user, function(err) {
				if (err) { return next(err); }
				req.session.flash = {
					type: 'Erfolg',
					intro: 'Willkommen!',
					message: 'Du bist richtig eingelogged.',
					};	
				if(req.session.hasOwnProperty('cart')){
					if(req.session.cart.hasOwnProperty('user')){
						if (!(JSON.stringify(user._id) == JSON.stringify(req.session.cart.user))) {
						req.session.cart = { items: [], total: 0}; 
						}
					}
				}
				var lastPage = req.session.lastPage;
				req.session.lastPage='';
				return res.redirect(lastPage);
			});
		})(req, res, next);
	},

	logout: function(req, res){
		req.logout();
		res.redirect('/');
	},

	userDetail: function (req, res, next) {
		CUsers
			.findOne({ 'username' : req.params.username})
			.populate('customer', 'company') 
			.exec(function(err, user) {
			if (err || !user) {
				console.log('Could not find a user with that username - meaning user email');
				return next (err);		
			} else { // error or no user found
				context = {
					username: user.username,
					customer: user.customer.company,
					firstName: user.firstName,
					lastName: user.lastName,
					role: user.role,
					gender: user.gender
				}; // context
				res.render('user/detail', context);
			} // error or no user found
		}); // CUSers.findOne
	}, // userDetail

	userEdit: function (req, res, next) {
		CUsers
			.findOne({ 'username' : req.params.username})
			.populate('customer', 'company') 
			.exec(function(err, user) {
			if (err || !user) {
				console.log('Could not find a user with that username - meaning user email');
				return next (err);		
			} else { // error or no user found
				context = {
					userId: user._id,
					username: user.username,
					customer: user.customer.company,
					firstName: user.firstName,
					lastName: user.lastName,
					role: user.role,
					gender: user.gender
				}; // context
				res.render('user/edit', context);
			} // error or no user found
		}); // CUSers.findOne
	}, // userEdit

	processUserEdit: function (req, res, next) {
		CUsers.findById(req.body.userId, function(err, user) {
			if (err || !user) {
				console.log('Irgendwas stimmt hier bei processUserEdit nicht');
				return res.redirect('/user');
			} else {
				user.firstName = req.body.firstName;
				user.lastName = req.body.lastName;
				user.gender = req.body.gender
				user.save(function(err, updatedUser) {
	                if(err) return next(err);
		            res.redirect(303, '/user/' + req.body.username);
	            }); // customer.save
			} // else			
		}); // CUsers.findById
	}, // processUserEdit

};