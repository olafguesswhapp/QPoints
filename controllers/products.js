var Products = require('../models/products.js');

module.exports = {

	registerRoutes: function(app) {
		app.get('/produkte/create', this.create);
		app.post('/produkte/create', this.productCreation);
		app.get('/produkte', this.productsCatalog);
		app.get('/produkte/:nr', this.productDetail);
	},

	create: function(req, res, next) {
		res.render('products/create');
	},

	productCreation: function(req, res, next) {
		// TODO: back-end validation (safety)
		var c = new Products({
			productName: req.body.productName,
			nr: req.body.nr,
			price: req.body.price,
		});
		c.save(function(err) {
			if(err) return next(err);
			res.redirect(303, '/produkte');
		});
	},

	productDetail: function(req, res, next) {
		Products.find({ nr : req.params.nr }, function(err, product) {
			if(err) return res.redirect(303, '/error');
			if(!product) return next(); 	// pass this on to 404 handler
			res.render('products/detail', product[0]);
		});
	},

	productsCatalog: function (req, res, next) {
		Products.find(function(err, products) {
			var context = {
				products: products.map(function(product){
					return {
						nr: product.nr,
						productName: product.productName,
						price: product.price.toFixed(2),
					}
				})
			};
			res.render('products/catalog', context);		
		})
	},
};