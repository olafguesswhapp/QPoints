var mongoose = require('mongoose');
var Order = require('./order.js');
var Schema = mongoose.Schema;
var User = require('../models/user.js');

var customerSchema = new Schema({
	nr: String,
	firstName: String,
	lastName: String,
	email: String,
	address1: String,
	address2: String,
	city: String,
	state: String,
	zip: String,
	country: String,
	phone: String,
	user: [{ type: Schema.Types.ObjectId, ref: 'User' }],
});
customerSchema.methods.getOrders = function(cb){
	return Order.find({ customerId: this._id }, cb);
};
var Customer = mongoose.model('Customer', customerSchema);
module.exports = Customer;