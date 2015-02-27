var Orders = require('../models/orders.js');
var Products = require('../models/products.js');
var CUsers = require('../models/cusers.js');
var Reels = require('../models/reels.js');
var moment = require('moment');


function LoggedInUserOnly(req, res, next) {
	if (!req.user) {
		req.session.flash = {
			type: 'Warnung',
			intro: 'Sie müssen bitte als User eingelogged sein.',
			message: 'Bitte melden Sie sich mit Ihrem Email und Passwort an.',
		};
		req.session.lastPage = req.path;
		return res.redirect(303, '/login');
	} else { return next();}
};

module.exports = {

	// order routes
	registerRoutes: function(app){
		app.get('/bestellungen/bestaetigt', this.confirmed);
		app.get('/bestellungen', LoggedInUserOnly, this.home);
	},

	// order confirmed
	confirmed: function(req, res, next){
		// internal transaction execution
		// 1st check: where does user come from
		if (req.header('Referer').indexOf('/warenkorb/checkout')<0) {
			req.session.flash = {
				type: 'Warnung',
				intro: 'Sie kommen nicht vom Warenkorb Checkout.',
				message: 'Zu Ihrer Sicherheit wird diese Bestellung abgebrochen',
			};
			next();
		}
		// 
		CUsers.findById(req.user._id, function(err, user){
			// neuste BestellungsNr definieren
			Orders.findOne({}, {}, {sort: {'nr' : -1}})
				.populate('items.prodId', 'nr')
				.exec(function(err, order){
			if (!order) {
				var orderNr = 'B1000001';
			} else {
				var orderNr = order.nr.match(/\D+/)[0] + (parseInt(order.nr.match(/\d+/))+1);
			}
			// neue Order speichern
			var o = new Orders ({
				nr: orderNr,
				orderStatus: 'erfasst',
				items: req.session.cart.items.map(function(item){
					return {
					prodId: item._id,
					prodNr: item.nr,
					prodQuantity: item.quantity,
					prodPrice: item.price,
					prodSum: item.itemSum,
					}
				}),
				total: req.session.cart.total,
				customer: user.customer,
				approved: moment(new Date()).format('YYYY-MM-DDTHH:mm'),
				approvedBy: user._id,
				paymentStatus: 'offen',
				deliveryStatus: 'offen',
			}); // new Order
			// check if Reels where ordered
			var RequiReels = 0;
			for(var i=0; i < o.items.length; i++){
				if(o.items[i].prodNr =='R10001'){
					RequiReels = o.items[i].prodQuantity;
					break;}
			}
			
			// allocate Reels
			Reels.find({ 'reelStatus': 'erfasst'}, function(err,reels){
				if (RequiReels>0 && reels.length >= RequiReels) { // enoght unused reels to allocate
					reels.forEach(function(reel, index){
						if(index<RequiReels){
							o.allocatedReels.push(reels[index]);
							o.orderStatus = 'Rolle/n zugeordnet';
							o.deliveryStatus = 'versendbar';
							reel.customer = o.customer;
							reel.reelStatus = 'zugeordnet';
							reel.save();
						} // if for still reel product unallocated
					}); // ForEach 
				} else { }// enough unused reels?
				// ToDo Payment process !!!
				o.save(function(err, savedOrder){
					if(err) return next(err);
					req.session.cart = { items: [], total: 0}; //REQ.SESSION.LÖSCHEN!!!
					res.redirect(303, '/bestellungen');
				}); // Save new Ordner in DB
			}); // Reels

		}); // Orders
		}); // Users
	},

	home: function(req, res, next){
		CUsers.findById(req.user._id, function(err, user){
			Orders.find({'customer' : user.customer})
						.populate('approvedBy', 'firstName lastName')
						.populate('items.prodId', 'nr productName')
						.exec(function(err, orders){
				var context = {
					orders: orders.map(function(order){
						return {
							nr: order.nr,
							orderStatus: order.orderStatus,
							approvedName: order.approvedBy.firstName + ' ' + order.approvedBy.lastName,
							approved: moment(order.approved).format('DD.MM.YYYY'),
							paymentStatus: order.paymentStatus,
							deliveryStatus: order.deliveryStatus,
							total: order.total.toFixed(2),
							items: order.items.map(function(item){
								return {
									nr: item.prodId,
									prodQuantity: item.prodQuantity,
									prodPrice: item.prodPrice.toFixed(2),
									prodSum: item.prodSum.toFixed(2),
								}
							}), // items.map
						}
					}), // orders.map
				}; // var context
				res.render('order/library', context);
			}); // Orders find
		}); // Users find
	},

};