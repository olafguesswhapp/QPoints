var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Customers = require('../models/customers.js');
var Programs = require('../models/programs.js');
var uniqueValidator = require('mongoose-unique-validator');
var bcrypt = require('bcrypt'),
	SALT_WORK_FACTOR = 10;

var cUsersSchema = new Schema({
	username: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	customer: { type: Schema.Types.ObjectId, ref: 'Customers'},
	particiPrograms: [{program: { type: Schema.Types.ObjectId, ref: 'Programs'}, count: Number}],
	hitGoalPrograms: [{program: { type: Schema.Types.ObjectId, ref: 'Programs'}, hitGoalCount: Number}],
	redeemPrograms:[{program: { type: Schema.Types.ObjectId, ref: 'Programs'}, redeemCount: Number}],
	// authId: String,
	firstName: String,
	lastName: String,
	role: String,
	created: Date,
	gender: Number,
});

// make sure username (email) is unique
cUsersSchema.plugin(uniqueValidator, { message: 
	'Diese Email-Adresse (Email = Username) wird bereits von einem anderen User verwendet.' });

// Bcrypt middleware
cUsersSchema.pre('save', function(next, done) {
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
cUsersSchema.methods.comparePassword = function(candidatePassword, cb) {
	bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
		if(err) return cb(err);
		cb(null, isMatch);
	});
};

var CUsers = mongoose.model('CUsers', cUsersSchema, 'users');
module.exports = CUsers;