
var main = require('./handlers/main.js');
var TestMongoDB = require('./handlers/TestMongoDB.js');

var customerController = require('./controllers/customer.js');
var userController = require('./controllers/user.js');
var productsController = require('./controllers/products.js');
var reelsController = require('./controllers/reels.js');
var programController = require('./controllers/programs.js');
var cartController = require('./controllers/cart.js');
var orderController = require('./controllers/order.js');
var transactionController = require('./controllers/transaction.js');
var resetController = require('./controllers/reset.js');

module.exports = function(app) {

	// miscellaneous routes
	app.get('/', main.home);
	app.get('/newsletter', main.newsletter);
	app.post('/newsletter', main.newsletterProcessPost);
	app.get('/newsletter/archive', main.newsletterArchive);

	// test MongoDB
	app.get('/waehlen/:wahl', TestMongoDB.wahl);
	app.get('/testMongo', TestMongoDB.testMongo);
	app.get('/api', TestMongoDB.testapi);
	app.get('/apishow/:nr', TestMongoDB.apiShow);
	app.post('/apiNewReel', TestMongoDB.apiNewReel);
	app.delete('/apideleteuser', TestMongoDB.deleteUser);
	app.get('/apirequest', TestMongoDB.sendHttp);
	app.post('/apirequest', TestMongoDB.processSendHttp);
	app.post('/apireceiverequest', TestMongoDB.processApiRequest);

	// customer routes
	customerController.registerRoutes(app);

	// user routes
	userController.registerRoutes(app);
	
	// products routes
	productsController.registerRoutes(app);

	// reel routes
	reelsController.registerRoutes(app);

	// program routes
	programController.registerRoutes(app);

	// cart routes
	cartController.registerRoutes(app);

	// order routes
	orderController.registerRoutes(app);

	// transaction routes
	transactionController.registerRoutes(app);

	// reset route
	resetController.registerRoutes(app);
};
