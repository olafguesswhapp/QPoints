
var main = require('./handlers/main.js');
var apiController = require('./controllers/api.js');
var customerController = require('./controllers/customer.js');
var userController = require('./controllers/user.js');
var productsController = require('./controllers/products.js');
var reelsController = require('./controllers/reels.js');
var programController = require('./controllers/programs.js');
var cartController = require('./controllers/cart.js');
var orderController = require('./controllers/order.js');
var myPointsController = require('./controllers/mypoints.js');
var resetController = require('./controllers/reset.js');
var newsFeedController = require('./controllers/newsfeed.js');

module.exports = function(app) {

	// miscellaneous routes
	app.get('/', main.home);
	app.get('/newsletter', main.newsletter);
	app.post('/newsletter', main.newsletterProcessPost);
	app.get('/newsletter/archive', main.newsletterArchive);

	// api Controller
	apiController.registerRoutes(app);

	// news Feed Controller
	newsFeedController.registerRoutes(app);

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

	// mypoints routes
	myPointsController.registerRoutes(app);

	// reset route
	resetController.registerRoutes(app);
};
