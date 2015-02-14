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
				_id: item._id,
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

function addToCart(nr, req, res, next){
	var cart = req.session.cart || (req.session.cart = { items: [] });
	Products.findOne({nr : nr} , function(err, product){
		if(err) return next(err);
		if(!product) return next(new Error('Unbekanntes QPoints Produkt: ' + nr));
		var findId = getIndexOfCartItem(cart.items, nr, req);
		if (findId>-1) {
			cart.items[findId].quantity++;
			cart.items[findId].itemSum = (cart.items[findId].price * cart.items[findId].quantity).toFixed(2);
		} else {
		cart.items.push({
			_id: product._id,
			nr: nr,
			productName: product.productName,
			price: product.price.toFixed(2),
			quantity: 1, // quantity ||
			itemSum: product.price.toFixed(2),
		});	// cart item push if 1st cart		
		} // end else
		cart.total = 0;
		for(var i in cart.items) {cart.total += cart.items[i].itemSum}
		cart.total = parseFloat(cart.total).toFixed(2);
		req.session.flash = {
			type: 'Danke',
			intro: 'Wir habe ein "' + product.productName + '" dem Warenkorb hinzugefügt.',
			message: 'Vielen Dank',
		};
		res.redirect('back');
	}); // Products find
}

function substractFromCart(nr, req, res, next){
	var cart = req.session.cart || (req.session.cart = { items: [] });
	Products.findOne({nr : nr} , function(err, product){
		if(err) return next(err);
		if(!product) return next(new Error('Unbekanntes QPoints Produkt: ' + nr));
		var findId = getIndexOfCartItem(cart.items, nr, req);
		if (findId>-1) {
			if (cart.items[findId].quantity>1){
				cart.items[findId].quantity--;
				cart.items[findId].itemSum = (cart.items[findId].price * cart.items[findId].quantity).toFixed(2);
			} else if (cart.items[findId].quantity==1){
				cart.items.splice(findId,1);
			}
		} 
		cart.total = 0;
		for(var i in cart.items) {cart.total += cart.items[i].itemSum}
		cart.total = parseFloat(cart.total).toFixed(2);
		req.session.flash = {
			type: 'Danke',
			intro: 'Wir habe den Warenkorb um ein "' + product.productName + '" reduziert.',
			message: 'Vielen Dank',
		};
		res.redirect('back');
	}); // Products find
}

module.exports = {

	// shopping cart routes
	registerRoutes: function(app) {
		app.get('/warenkorb', middleware, this.home);
		app.get('/warenkorb/add', this.addProcessGet);
		app.get('/warenkorb/sub', this.subProcessGet);
		app.get('/warenkorb/checkout', this.checkout);
	},

	addProcessGet : function(req, res, next){
		addToCart(req.query.nr, req, res, next);
	},

	subProcessGet : function(req, res, next){
		substractFromCart(req.query.nr, req, res, next);
	},

	home : function(req, res, next){
		User.findById(req.user._id, function(err, user){
			if (req.session.cart) {
				var context = {
					name: user.firstName + ' ' + user.lastName,
					cart: req.session.cart,
				}; // context
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
				email: user.customer.email,
			};
			res.render('cart/checkout', context);
		});
	},

};