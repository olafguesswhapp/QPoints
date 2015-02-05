var Products = require('../models/products.js'),
	Q = require('q');
	
function getIndexOfCartItem(arr, k){
	for(var i=0; i<arr.length; i++){
		var index = arr[i].nr.indexOf(k);
		if (index > -1){
			return i;
		}
	}
	return i=-1;
};
// emailService = require('../lib/email.js')(require('../credentials.js'));

// var VALID_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// deserializes cart items from the database
exports.middleware = function(req, res, next){
	var cart = req.session.cart;
	if(!cart || !cart.items) return next();
	req.cart = {
		items: cart.items.map(function(item){
			return {
				nr: item.nr,
				productName: item.productName,
				quantity: item.quantity,
				
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

function addToCart(nr, quantity, req, res, next){
	var cart = req.session.cart || (req.session.cart = { items: [] });
	Products.find({ nr : nr }, function(err, product){
		if(err) return next(err);
		if(!product) return next(new Error('Unbekanntes QPoints Produkt: ' + nr));
		var findId = getIndexOfCartItem(cart.items, nr);
		if (findId>-1) {
			cart.items[findId].quantity++;
		} else {
		cart.items.push({
			nr: nr,
			productName: product[0].productName,
			quantity: quantity || 1,
		});			
		}
		res.redirect(303, '/warenkorb');
	});
}

exports.addProcessGet = function(req, res, next){
	addToCart(req.query.nr, req.query.guests, req, res, next);
};

exports.addProcessPost = function(req, res, next){
	addToCart(req.body.nr, req.body.guests, req, res, next);
};

exports.home = function(req, res, next){
	res.render('cart', { cart: req.cart });
};

exports.checkout = function(req, res, next){
	var cart = req.session.cart;
	if(!cart) next();
	res.render('cart-checkout');
};

exports.thankYou = function(req, res){
	res.render('cart-thank-you', { cart: req.session.cart });
};

exports.emailThankYou = function(req, res){
	res.render('email/cart-thank-you', { cart: req.session.cart, layout: null });
};

// exports.checkoutProcessPost = function(req, res){
// 	var cart = req.session.cart;
// 	if(!cart) next(new Error('Cart does not exist.'));
// 	var name = req.body.name || '', email = req.body.email || '';
// 	// input validation
// 	if(!email.match(VALID_EMAIL_REGEX)) return res.next(new Error('Invalid email address.'));
// 	// assign a random cart ID; normally we would use a database ID here
// 	cart.number = Math.random().toString().replace(/^0\.0*/, '');
// 	cart.billing = {
// 		name: name,
// 		email: email,
// 	};
//     res.render('email/cart-thank-you', 
//     	{ layout: null, cart: cart }, function(err,html){
// 	        if(err) console.error('error in email template: ' + err.stack);
// 	        emailService.send(cart.billing.email,
// 	        	'Thank you for booking your trip with Meadowlark Travel!',
// 	        	html);
// 	    }
//     );
//     res.render('cart-thank-you', { cart: cart });
// };