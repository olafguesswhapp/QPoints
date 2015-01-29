
var main = require('./handlers/main.js');
var TestMongoDB = require('./handlers/TestMongoDB.js');
var customerController = require('./controllers/customer.js');
var productsController = require('./controllers/products.js');
var cart = require('./handlers/cart.js');
var cartValidation = require('./lib/cartValidation.js');


module.exports = function(app) {

	// miscellaneous routes
	app.get('/', main.home);
	app.get('/newsletter', main.newsletter);
	app.post('/newsletter', main.newsletterProcessPost);
	app.get('/newsletter/archive', main.newsletterArchive);

	// test MongoDB
	app.get('/waehlen/:wahl', TestMongoDB.wahl);
	app.get('/testMongo', TestMongoDB.testMongo);

	// customer routes
	customerController.registerRoutes(app);
	
	// products routes
	productsController.registerRoutes(app);

	// shopping cart routes
	app.get('/cart', cart.middleware, cart.home);
	app.get('/cart/add', cart.addProcessGet);
	app.post('/cart/add', cart.addProcessPost);
	app.get('/cart/checkout', cart.checkout);


};
