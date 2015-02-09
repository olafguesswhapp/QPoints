var mongoose = require('mongoose');
var Customer = require('../models/customer.js');
var Schema = mongoose.Schema;
var uniqueValidator = require('mongoose-unique-validator');
var bcrypt = require('bcrypt'),
	SALT_WORK_FACTOR = 10;
// var Customers = require('../models/customer.js');

var userSchema = new Schema({
	username: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	customer: { type: Schema.Types.ObjectId, ref: 'Customer'},
	// customerId: { type: Schema.Types.ObjectId, ref: 'Customers' },
	// authId: String,
	firstName: String,
	lastName: String,
	role: String,
	created: Date,
});

// make sure username (email) is unique
userSchema.plugin(uniqueValidator, { message: 
	'Diese Email-Adresse (Email = Username) wird bereits von einem anderen User verwendet.' });

// Bcrypt middleware
userSchema.pre('save', function(next, done) {
	var user = this; 
	if(!user.isModified('password')) return next(); // Bcrypt middleware
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

// Check email is unique
userSchema.methods.emailIsUnique = function(email){

}

var User = mongoose.model('User', userSchema, 'users');
module.exports = User;