
var main = require('./handlers/main.js');
var TestMongoDB = require('./handlers/TestMongoDB.js');
var customerController = require('./controllers/customer.js');


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

};
