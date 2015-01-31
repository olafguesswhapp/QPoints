var mongoose = require('mongoose');
var Order = require('./order.js');
var customerSchema = mongoose.Schema({
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
});
customerSchema.methods.getOrders = function(cb){
	return Order.find({ customerId: this._id }, cb);
};
var Customer = mongoose.model('Customer', customerSchema);
module.exports = Customer;