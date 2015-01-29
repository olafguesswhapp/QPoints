var mongoose = require('mongoose');

var productsSchema = new mongoose.Schema({
	productName: String,
	nr: String,
	price: Number,
});

var Products = mongoose.model('Products', productsSchema,'products');
module.exports = Products;