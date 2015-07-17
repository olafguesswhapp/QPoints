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
    successRedirect: '/login',
    failureRedirect: 'unauthorized',
});
// var sslOptions = {
//     key: fs.readFileSync('./ssl/localhost.key'),
//     cert: fs.readFileSync('./ssl/localhost.key.crt')
// };

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
    case 'development':
        mongoose.connect(credentials.mongo.development.connectionString, opts);
        break;
    case 'production':
        mongoose.connect(credentials.mongo.production.connectionString, opts);
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

app.set('port', process.env.PORT || 3000); // 61099 or other port for uberspace

var MongoSessionStore = require('session-mongoose')(require('connect'));
var sessionStore = new MongoSessionStore({ url: credentials.mongo.development.connectionString });

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
    if (!req.user) {
        res.locals.roleLevel = 0;
    } else {
        res.locals.loggedInUser = req.user.firstName;
        res.locals.loggedInUsername = req.user.username;
        res.locals.roleLevel = qplib.defineRole(req);
    }
    return next();
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

// https.createServer(sslOptions, app).listen(app.get('port'), function(){
//     console.log('Express HTTPS started in ' + app.get('env') + ' mode on port ' + app.get('port') + '.');
// });

// IN ORDER TO RUN ON HTTP instead of https
app.listen(app.get('port'), function(){
  console.log( 'Express started on http://localhost:' + 
    app.get('port') + ' in ' + app.get('env') + '-mode ; press Ctrl-C to terminate.' );
});