var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Reels = require('../models/reels.js');
var User = require('../models/user.js');
var Customer = require('../models/customer.js');
var Products = require('../models/products.js');

var orderSchema = new Schema({
	nr: String,
	orderStatus: String,
	items: [{ prodId: { type: Schema.Types.ObjectId, ref: 'Products'}, prodQuantity: Number, prodPrice: Number, prodSum: Number}],
	total: Number,
	customer: { type: Schema.Types.ObjectId, ref: 'Customer'},
	approved: Date,
	approvedBy: { type: Schema.Types.ObjectId, ref: 'User'},
	paymentStatus: String,
	deliveryStatus: String,
	allocatedReels: [{ type: Schema.Types.ObjectId, ref: 'Reels' }]	
});
var Order = mongoose.model('Order', orderSchema);
module.exports = Order;