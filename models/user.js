var mongoose = require('mongoose');
var Customer = require('../models/customer.js');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt'),
	SALT_WORK_FACTOR = 10;
// var Customers = require('../models/customer.js');

var userSchema = new Schema({
	username: String,
	password: String,
	customer: { type: Schema.Types.ObjectId, ref: 'Customer'},
	// customerId: { type: Schema.Types.ObjectId, ref: 'Customers' },
	// authId: String,
	name: String,
	role: String,
	created: Date,
});

// Bcrypt middleware
userSchema.pre('save', function(next) {
	var user = this;
	if(!user.isModified('password')) return next();
	bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
		if(err) return next(err);
		bcrypt.hash(user.password, salt, function(err, hash) {
			if(err) return next(err);
			user.password = hash;
			next();
		});
	});
});

// Password verification
userSchema.methods.comparePassword = function(candidatePassword, cb) {
	bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
		if(err) return cb(err);
		cb(null, isMatch);
	});
};

var User = mongoose.model('User', userSchema, 'users');
module.exports = User;