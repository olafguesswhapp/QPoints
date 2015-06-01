var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var expressSession = require('express-session');
var cookieParser = require('cookie-parser');
var methodOverride = require('method-override');
var credentials = require('./credentials.js');
var auth = require('./lib/auth.js')(app, {
    successRedirect: '/login',
    failureRedirect: 'unauthorized',
});
//Mongoose Schema and Model
var TestDB = require('./models/testDB.js');

var mongoose = require('mongoose');
// Connect mongoose with mongoDB
// do not forget to open a 2nd terminal window and start mongoDB with "mongod" upfront
var opts = {
    server: {
        socketOptions: {keepAlive: 1}
    }
};
switch(app.get('env')){
    case 'development': mongoose.connect(credentials.mongo.development.connectionString, opts);
    break;
    case 'production': mongoose.connect(credentials.mongo.production.connectionString, opts);
    break;
    default:
    throw new Error('Unknown execution environment: ' + app.get('env'));
}

// Email versenden
// var emailService = require('./lib/email.js')(credentials);

// set up handlebars view engine
var handlebars = require('express3-handlebars')
	.create({
		defaultLayout:'main',
		helpers: {
        section: function(name, options){
            if(!this._sections) this._sections = {};
            this._sections[name] = options.fn(this);
            return null;
        },
        static: function(name) {
            return require('./lib/static.js').map(name);
        },
        itemSumOld: function(items){
            return items.price * items.quantity;
        },
        newsLimitCheck: function(value1, value2, options) {
            if (value1 < value2) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        },
    }
});	
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

var MongoSessionStore = require('session-mongoose')(require('connect'));
var sessionStore = new MongoSessionStore({ url: credentials.mongo.development.connectionString });

app.use(cookieParser(credentials.cookieSecret));
app.use(expressSession({
    secret: credentials.sessionSecret,
    store: sessionStore,
    saveUninitialized: true,
    resave: true
}));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// flash message middleware
app.use(function(req, res, next){
    // if there's a flash message, transfer
    // it to the context, then clear it
    res.locals.flash = req.session.flash;
    delete req.session.flash;
    next();
});

//auth.init() links in Passport middleware;
auth.init();

// middleware to provide cart data for header
app.use(function(req, res, next) {
    var cart = req.session.cart;
    res.locals.cartItems = cart && cart.items ? cart.items.length : 0;
    if (!req.user) return next();
    res.locals.loggedInUser = req.user.firstName;
    // res.locals.loggedInUser = req.user.username.split('@')[0];
    next();
});

// add routes
require('./routes.js')(app);

//testen Email versand
app.get('/eBrief', function(req, res){
    // emailService.send('olaf@guesswhapp.de', 'Action - mailli test', 'hallo, ich bin gespannt ob jetzt der nodemailer immer noch funktioniert');
    req.session.flash = {
        type: 'Erfolg',
            intro: 'Danke!',
            message: 'Die email wurde versendet.',
        };
    res.render('eBrief');
});

// 404 catch-all handler (middleware)
app.use(function(req, res, next){
	res.status(404);
	res.render('404');
});

// 500 error handler (middleware)
app.use(function(err, req, res, next){
	console.error(err.stack);
	res.status(500);
	res.render('500');
});

app.listen(app.get('port'), function(){
  console.log( 'Express started on http://localhost:' + 
    app.get('port') + '; press Ctrl-C to terminate.' );
});