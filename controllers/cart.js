var Products = require('../models/products.js');
var User = require('../models/user.js');
var Q = require('q');

// in order to have quantities instead of many times the same product in cart
function getIndexOfCartItem(cartItems, k, req){
	for(var i=0; i<cartItems.length; i++){
	var index = cartItems[i].nr.indexOf(k);
	if (index > -1){return i;}
	} 
	return i=-1;
};

// deserializes cart items from the database
function middleware(req, res, next){
	var cart = req.session.cart;
	if(!cart || !cart.items) return next();
	req.cart = {
		items: cart.items.map(function(item){
			return {
				nr: item.nr,
				productName: item.productName,
				quantity: item.quantity,
				price: item.price,
				itemSum: item.itemSum,
			};
		})
	};
	var promises = [];
	req.cart.items.forEach(function(item){
		var d = Q.defer();
		promises.push(d.promise);
		Products.findOne({ nr: item.nr }, function(err, products){
			if(err) return d.reject(err);
			item.products = products;
			d.resolve();
		});
	});
	Q.all(promises)
		.then(function(){
			next();
		})
		.catch(function(err){
			next(err);	
		});
};

function addToCart(nr, guest, req, res, next){
	var cart = req.session.cart || (req.session.cart = { items: [] });
	Products.findOne({nr : nr} , function(err, product){
		if(err) return next(err);
		if(!product) return next(new Error('Unbekanntes QPoints Produkt: ' + nr));
		var findId = getIndexOfCartItem(cart.items, nr, req);
		if (findId>-1) {
			cart.items[findId].quantity++;
			cart.items[findId].itemSum = cart.items[findId].price * cart.items[findId].quantity;
		} else {
		cart.items.push({
			nr: nr,
			productName: product.productName,
			price: product.price,
			quantity: 1, // quantity ||
			itemSum: product.price,
		});			
		}
		cart.total = 0;
		cart.user = req.user._id;
		for(var i in cart.items) {cart.total += cart.items[i].itemSum}
		res.redirect(303, '/warenkorb');
	});
}

module.exports = {

	// shopping cart routes
	registerRoutes: function(app) {
		app.get('/warenkorb', middleware, this.home);
		app.get('/warenkorb/add', this.addProcessGet);
		app.post('/warenkorb/add', this.addProcessPost);
		app.get('/warenkorb/checkout', this.checkout);
	},

	addProcessGet : function(req, res, next){
		addToCart(req.query.nr, req.query.guests, req, res, next);
	},

	addProcessPost : function(req, res, next){
		addToCart(req.body.nr, req.body.guests, req, res, next);
	},

	home : function(req, res, next){
		User.findById(req.user._id, function(err, user){
			if (req.session.cart) {
				var context = {
					name: user.firstName + ' ' + user.lastName,
					cart: req.session.cart,
				};	
			} else {
				var context = {
					name: user.firstName + ' ' + user.lastName,
					cart: {
						items: {
							productName: 'Sie haben noch keine Produkte in den Warenkorb gelegt',
						}
					}
				}; 
			}
			res.render('cart/cart', context);
		});	
	},

	checkout : function(req, res, next){
		User.findById(req.user._id)
					.populate('customer')
					.exec(function(err, user){
			var cart = req.session.cart;
			var context ={
				cart: cart,
				name: user.customer.firstName + ' ' + user.customer.lastName,
				company: user.customer.company,
				address1: user.customer.address1,
				address2: user.customer.address2,
				zip: user.customer.zip,
				city: user.customer.city,
			};
			res.render('cart/checkout', context);
		});
	},

};