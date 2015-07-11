var Products = require('../models/products.js');
var qplib = require('../lib/qpointlib.js');

module.exports = {

	registerRoutes: function(app) {
		app.get('/produkte/anlegen', qplib.adminOnly, this.create);
		app.post('/produkte/anlegen', this.processCreation);
		app.get('/produkte', this.productsCatalog);
		app.get('/produkte/:nr', this.productDetail);
	},

	create: function(req, res, next) {
		var context;
		Products.findOne({})
				.sort({'nr': -1})
				.select('nr')
				.exec(function(err, product){
			if (!product) {
				context = {
					navProduct: 'class="active"',
					productNr : 'PR1001'
				};
			} else {
				context = {
					navProduct: 'class="active"',
					productNr : product.nr.match(/\D+/)[0] + (parseInt(product.nr.match(/\d+/))+1)
				};
			}
			res.render('products/create', context);
		}); // Products.findOne
	},

	processCreation: function(req, res, next) {
		// TODO: back-end validation (safety)
		console.log(req.body);
		var c = new Products({
			productName: req.body.productName,
			nr: req.body.productNr,
			price: req.body.price,
		});
		c.save(function(err) {
			if(err) return next(err);
			res.redirect(303, '/produkte');
		});
	},

	productDetail: function(req, res, next) {
		Products.findOne({ nr : req.params.nr }, function(err, product) {
			if(err) return res.redirect(303, '/error');
			if(!product) return next(); 	// pass this on to 404 handler
			console.log(product);
			var context = {
				navProduct: 'class="active"',
				nr: product.nr,
				productName: product.productName,
				price: product.price.toFixed(2),
			};
			res.render('products/detail', context);
		});
	},

	productsCatalog: function (req, res, next) {
		Products.find(function(err, products) {
			var context = {
				navProduct: 'class="active"',
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