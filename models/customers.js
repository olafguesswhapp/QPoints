var mongoose = require('mongoose');
var Orders = require('./orders.js');
var Schema = mongoose.Schema;
var CUsers = require('../models/cusers.js');

var customersSchema = new Schema({
	nr: String,
	company: String,
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
	user: [{ type: Schema.Types.ObjectId, ref: 'CUsers' }],
});

var Customers = mongoose.model('Customers', customersSchema);
module.exports = Customers;