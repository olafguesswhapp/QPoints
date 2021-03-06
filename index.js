// DEPENDENCIES
// ============
var express = require('express');
var path = require('path');
var https = require('https');
var app = express();
var bodyParser = require('body-parser');
var fs = require('fs');
var expressSession = require('express-session');
var cookieParser = require('cookie-parser');
var methodOverride = require('method-override');
var credentials = require('./credentials.js');
var qplib = require('./lib/qpointlib.js');
var auth = require('./lib/auth.js')(app, {
    successRedirect: '/',
    failureRedirect: 'unauthorized',
});
var mongoose = require('mongoose');
var MongoSessionStore = require('session-mongoose')(require('connect'));
// Email versenden
// var emailService = require('./lib/email.js')(credentials);

// INTANTIATIONS
// =============
// var sslOptions = {
//     key: fs.readFileSync('./ssl/localhost.key'),
//     cert: fs.readFileSync('./ssl/localhost.key.crt')
// };

var opts = {
    server: {
        socketOptions: {keepAlive: 1}
    }
};
// do not forget to open a 2nd terminal window and start mongoDB with "mongod" upfront
switch(app.get('env')){
    case 'development':
        var sessionStore = new MongoSessionStore({ url: credentials.mongo.development.connectionString });
        mongoose.connect(credentials.mongo.development.connectionString, opts);
        console.log('Using MongoDB development mode');
        break;
    case 'production':
        var sessionStore = new MongoSessionStore({ url: credentials.mongo.production.connectionString });
        mongoose.connect(credentials.mongo.production.connectionString, opts);
        console.log('Using MongoDB production mode');
        break;
    default:
        throw new Error('Unknown execution environment: ' + app.get('env'));
}

// CONFIGURATIONS
// ==============
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
        contentCheck: function(value1, value2, options) {
            if (value1 == value2) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        },
        gt: function (value, test, options) {
            if (value > test) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        },
        times: function(n, block) {
            var accum = '';
            for(var i = 0; i < n; ++i){
                accum += block.fn(i);
            }
            return accum;
        },
    }
});	
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
if (app.get('env') == 'development') {
    app.set('port', process.env.PORT || 3000);
} else if (app.get('env') == 'production') {
    app.set('port', process.env.PORT || 61099); // Uberspace
}

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.sendStatus(200);
    } else {
      next();
    }
};

// MIDDLEWARE
// ==========
app.use(cookieParser(credentials.cookieSecret));
app.use(expressSession({
    secret: credentials.sessionSecret,
    store: sessionStore,
    saveUninitialized: true,
    resave: true
}));
app.use(express.static(path.join(__dirname + '/public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(allowCrossDomain);
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
    qplib.defineNav(req, res);
    req.session.lastPage = req.path;
    if (!req.user) {
        res.locals.roleLevel = 0;
    } else {
        res.locals.loggedInUser = req.user.firstName;
        res.locals.loggedInUsername = req.user.username;
        res.locals.roleLevel = qplib.defineRole(req);
    }
    return next();
});

// ROUTES
// ======
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

// BOOTUP
// ======

// https.createServer(sslOptions, app).listen(app.get('port'), function(){
//     console.log('Express HTTPS started in ' + app.get('env') + ' mode on port ' + app.get('port') + '.');
// });

// IN ORDER TO RUN ON HTTP instead of https
app.listen(app.get('port'), function(){
  console.log( 'Express server listening on port ' + 
    app.get('port') + ' in ' + app.get('env') + '-mode; press Ctrl-C to terminate.' );
});