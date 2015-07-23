
var mainController = require('./controllers/main.js');
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

	mainController.registerRoutes(app); // main Controller
	apiController.registerRoutes(app); // api Controller
	newsFeedController.registerRoutes(app); // news Feed Controller
	customerController.registerRoutes(app); // customer routes
	userController.registerRoutes(app); // user routes
	productsController.registerRoutes(app); // products routes
	reelsController.registerRoutes(app); // reel routes
	programController.registerRoutes(app); // program routes
	cartController.registerRoutes(app); // cart routes
	orderController.registerRoutes(app); // order routes
	myPointsController.registerRoutes(app); // mypoints routes
	resetController.registerRoutes(app); // reset route
};
