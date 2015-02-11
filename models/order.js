var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Reels = require('../models/reels.js');
var User = require('../models/user.js');
var Customer = require('../models/customer.js');

var orderSchema = new Schema({
	nr: String,
	items: [{nr: String, quantity: Number, price: Number, itemSum: Number}],
	total: Number,
	
});
var Order = mongoose.model('Order', orderSchema);
module.exports = Order;