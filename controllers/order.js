var Order = require('../models/order.js');
var Products = require('../models/products.js');
var User = require('../models/user.js');
var Reels = require('../models/reels.js');
var moment = require('moment');

module.exports = {

	// order routes
	registerRoutes: function(app){
		app.get('/bestellungen/bestaetigt', this.confirmed);
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
		User.findById(req.user._id, function(err, user){
			// neuste BestellungsNr definieren
			Order.findOne({}, {}, {sort: {'nr' : -1}}, function(err, order){
			if (!order) {
				var orderNr = 'B1000001';
			} else {
				var orderNr = order.nr.match(/\D+/)[0] + (parseInt(order.nr.match(/\d+/))+1);
			}
			// neue Order speichern
			var o = new Order ({
				nr: orderNr,
				orderStatus: 'erfasst',
				items: req.session.cart.items.map(function(item){
					return {
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
				paymentStatus: 'start',
				deliveryStatus: 'start',
			}); // new Order
			// check if Reels where ordered
			var RequiReels = 0;
			for(var i=0; i < o.items.length; i++){
				if(o.items[i].prodNr=='R10001'){
					RequiReels = o.items[i].prodQuantity;
					break;}
			}
			// allocate Reels
			Reels.find({ 'reelStatus': 'erfasst'}, function(err,reels){
				if (reels.length >= RequiReels) { // enoght unused reels to allocate
					reels.forEach(function(reel, index){
						if(index<=o.items.length){
							o.allocatedReels.push(reels[index]);
							o.orderStatus = 'Rollen zugeordnet';
							o.deliveryStatus = 'versendbar';
							reel.customer = o.customer;
							reel.reelStatus = 'zugeordnet';
							reel.save();
						} // if for still reel product unallocated
					}); // ForEach 
				} else { // enough unused reels?
				} // enough unused reels?
			// ToDo Payment process !!!
			o.save(function(err, savedOrder){
				if(err) return next(err);
				req.session.cart = { items: [], total: 0}; //REQ.SESSION.LÖSCHEN!!!
				next(); //ändern in redirect nach bestellung/nr
			}); // Save new Ordner in DB
			}); // Reels

		}); // Order
		}); // User
	},
};