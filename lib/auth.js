
var User = require('../models/user.js');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

passport.serializeUser(function(user, done){
	done(null, user._id, user.username);
});

passport.deserializeUser(function(id, done){
	User.findById(id, function(err, user){
		done(err, user);
	});
});

module.exports = function(app, options){

	// if success and failure redirects aren't specified,
	// set some reasonable defaults
	if(!options.successRedirect)
		options.successRedirect = '/';
	if(!options.failureRedirect)
		options.failureRedirect = '/login';

	return {
	
	init: function() {
		// configure Facebook Strategy
		passport.use(new LocalStrategy(
			function(username, password, done){
			User.findOne({ username: username }, function(err, user){
				console.log('der user vor If ist: ' + user);
				if (err) { return done(err); }
				if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
				user.comparePassword(password, function(err, isMatch) {
			      if (err) return done(err);
			      if(isMatch) {
			        return done(null, user);
			      } else {
			        return done(null, false, { message: 'Invalid password' });
			      }
			    });
			});
		}));

		app.use(passport.initialize());
		app.use(passport.session());
	},
	
	};

};