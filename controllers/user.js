var CUsers = require('../models/cusers.js');
var Customers = require('../models/customers.js');
var passport = require('passport');
var moment = require('moment');
var qplib = require('../lib/qpointlib.js');

function detachUserfromCustomer(username, customerNr){
	CUsers
		.findOne({ 'username' : username })
		.select('_id customer role')
		.exec(function(err, user){
		if (!user || err) {
			req.session.flash = {
				type: 'warning',
				intro: 'Der Username "' + username + '" ist nicht registriert.',
				message: err.errors.username.message,
			};
		} else {
			user.role = 'consumer';
			user.customer = undefined;
			user.save();
			Customers
				.findOne({ 'nr' : customerNr})
				.select('user')
				.exec(function(err, customer) {
				var executed = false;
				customer.user.forEach(function(customerUser, indexCU){
					if (JSON.stringify(customerUser) == JSON.stringify(user._id)){
						console.log(indexCU + ' at ' +  customerUser);
						customer.user.splice(indexCU, 1);
						executed = true;
					} // if
					if (executed == true) {
					customer.save();
					} // if
				}); // customer.user.forEach
			});	// Customers.findOne
		} // else
	}); // CUsers.findOne
}; // detachUserToProgram

module.exports = {

	registerRoutes: function(app) {
		app.get('/user/anlegen', qplib.checkUserRole8above, this.userRegister);
		app.post('/user/anlegen', qplib.checkUserRole8above, this.processUserRegister);
		app.get('/user/:username', qplib.checkUserRole8above, this.userDetail);
		app.get('/user/edit/:username', qplib.checkUserRole8above, this.userEdit);
		app.post('/user/edit/:username', qplib.checkUserRole8above, this.processUserEdit);
		app.get('/user', qplib.checkUserRole8above, this.userLibrary);
		app.get('/login', this.login);
		app.post('/login', this.processLogin);
		app.get('/logout', this.logout);
		app.post('/user/trennen', qplib.checkUserRole8above, this.processDetachUser);
		app.post('/user/verbinden', qplib.checkUserRole8above, this.processJoinUser);
	},

	// Neuen User anlegen - Voraussetzung = als Kunde angemeldet
	userRegister: function(req, res, next){
		if (!req.user) {
			res.redirect(303, '/');
		} else if (req.user.role != 'customer' && req.user.role != 'admin') {
			res.redirect(303, '/');
		} else {
			Customers.findById(req.user.customer, function(err, customer){
				var context = {
					actualCustomerId: customer._id,
					customerCompany: customer.company,
					actualUserName: req.user.username,
					customerName: customer.firstName + " " + customer.lastName,
				}; // var context
			res.render('user/register', context);
			}); // Custormers.findById
		} // else		
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
					type: 'warning',
					intro: 'Der Username "' + err.errors.username.value + '" muss einmalig sein.',
					message: err.errors.username.message,
				};
				res.redirect(303, '/user/anlegen');
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
				context.currentUser = req.user.username;
				res.render('user/library', context);
			});
		});
	},

	login: function(req, res){
		console.log('letzte Seite war ' + req.session.lastPage);
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
					type: 'warning',
					intro: 'Hinweis: ',
					message: 'Das Passwort für Username ' + req.body.username + ' stimmt nicht - Bitte versuchen Sie es erneut.',
					};
				return res.redirect('/login');
			} else if (!user) {
				req.session.flash = {
					type: 'warning',
					intro: 'Hinweis: ',
					message: 'Der Username ' + req.body.username + ' wurde bisher nicht angelegt. Bitte diesen als Kunde neu anmelden oder als User eines Kunden anlegen lassen.',
					};
				return res.redirect('/anmelden');
			}
			req.logIn(user, function(err) {
				if (err) { return next(err); }
				req.session.flash = {
					type: 'success',
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
				req.session.lastPage='/';
				return res.redirect(lastPage);
			});
		})(req, res, next);
	},

	logout: function(req, res){
		req.logout();
		res.redirect('/');
	},

	userDetail: function (req, res, next) {
		console.log(res.locals);
		CUsers
			.findOne({ 'username' : req.params.username})
			.populate('customer', 'company') 
			.exec(function(err, user) {
			if (err || !user) {
				console.log('Could not find a user with that username - meaning user email');
				req.session.flash = {
					type: 'warning',
					intro: 'Der Username "' + req.params.username + '" ist nicht angelegt.',
					message: err,
				};
				res.redirect(303, '/user');
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
				req.session.flash = {
					type: 'warning',
					intro: 'Der Username "' + req.params.username + '" ist nicht angelegt.',
					message: err,
				};
				res.redirect(303, '/user');
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
				req.session.flash = {
					type: 'warning',
					intro: 'Der Username "' + req.params.username + '" ist nicht angelegt.',
					message: err,
				};
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

	processDetachUser: function(req, res, next){
		console.log('jetzt User von Kunde trennen');
		console.log(req.body);
		detachUserfromCustomer(req.body.username, req.body.customerNr);
		res.redirect(303, '/user' );
	}, // processDetachUser


	processJoinUser: function(req, res, next){
		Customers
			.findOne({nr : req.body.customerNr})
			.select('_id user')
			.exec(function(err, customer){
			CUsers
				.findOne({ username: req.body.searchUsername})
				.select('_id username role customer')
				.exec(function(err, user){
				if(!user || err) {
					req.session.flash = {
	                    type: 'warning',
	                    intro: 'Der eingegebene User konnte nicht gefunden werden.',
	                    message: 'Bitte wiederholen Sie Ihre Eingabe mit einem anderen User.'
                	};
					res.redirect(303, '/user');
					return;
				} else { // if err
					if (user.role != 'consumer') {
						req.session.flash = {
		                    type: 'warning',
		                    intro: 'Der eingegebene User ist bereits zugeordnet.',
		                    message: 'Bitte ordnen Sie einen anderen User zu oder trennen Sie diesen User von einem anderen Kunden.'
	                	};
	                	res.redirect(303, '/user');
	                	return;
					} else if (user.role == 'consumer') { // if user is customer or already allocated
						console.log('zuordnung hat geklappt');
						user.customer = customer._id;
						user.role = 'user';
						user.save();
						customer.user.push(user._id);
						customer.save();
						res.redirect(303, '/user');
						return;
					} // customer allocation
				} // is not err or user was found
			}); // CUsers.findOne
		}); // Customer.findOne
	}, // processJoinUser
};