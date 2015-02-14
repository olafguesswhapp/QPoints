var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Reels = require('../models/reels.js');
var CUsers = require('../models/cusers.js');
var Customers = require('../models/customers.js');
var Products = require('../models/products.js');

var ordersSchema = new Schema({
	nr: String,
	orderStatus: String,
	items: [{ prodId: { type: Schema.Types.ObjectId, ref: 'Products'}, prodNr: String, prodQuantity: Number, prodPrice: Number, prodSum: Number}],
	total: Number,
	customer: { type: Schema.Types.ObjectId, ref: 'Customers'},
	approved: Date,
	approvedBy: { type: Schema.Types.ObjectId, ref: 'CUsers'},
	paymentStatus: String,
	deliveryStatus: String,
	allocatedReels: [{ type: Schema.Types.ObjectId, ref: 'Reels' }]	
});
var Orders = mongoose.model('Orders', ordersSchema);
module.exports = Orders;