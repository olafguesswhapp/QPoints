var Products = require('../models/products.js');

module.exports = {

	registerRoutes: function(app) {
		app.get('/products/create', this.create);
		app.post('/products/create', this.productCreation);
		app.get('/products', this.productsOverview);
		app.get('/products/:nr', this.productSingle);
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
			res.redirect(303, '/products');
		});
	},

	productSingle: function(req, res, next) {
		Products.find({ nr : req.params.nr }, function(err, product) {
			if(err) return res.redirect(303, '/error');
			if(!product) return next(); 	// pass this on to 404 handler
			res.render('products/single', {
				productName: product[0].productName,
				nr: product[0].nr,
				price: product[0].price,
			});
		});
	},

	productsOverview: function (req, res, next) {
		Products.find(function(err, products) {
			var context = {
				products: products.map(function(product){
					return {
						nr: product.nr,
						productName: product.productName,
						price: product.price,
					}
				})
			};
			res.render('products/overview', context);		
		})
	},
};