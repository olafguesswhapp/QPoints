var Orders = require('../models/orders.js');
var Products = require('../models/products.js');
var CUsers = require('../models/cusers.js');
var Reels = require('../models/reels.js');
var NewsFeed = require('../models/newsfeed.js');
var moment = require('moment');
var qplib = require('../lib/qpointlib.js');

function processReelOrder (req, requiReels, o) {
	Reels.find({ 'reelStatus': 'erfasst'})
			.select('_id customer reelStatus')
			.limit(requiReels)
			.exec(function(err,reels){
		console.log('requiReels: ' + requiReels);
		console.log(reels);
		reels.forEach(function(reel, indexR){
			o.allocatedReels.push(reel._id);
			reel.customer = o.customer;
			reel.reelStatus = 'zugeordnet';
			reel.save();
			if (indexR == reels.length - 1) {
				console.log('order to be saved');
				console.log(o);
				o.orderStatus = 'Rolle/n zugeordnet';
				o.deliveryStatus = 'versendbar';
				o.save();
			} // If last reels.forEach
		}); // ForEach 
		// ToDo  Payment process !!!
	}); // Reels
}; // processReelOrder

function processNewsOrder (req, requiNews, customerId) {
	for(indexRN = 0; indexRN<requiNews; indexRN++) {
		var newNews = new NewsFeed({
            customer: customerId,
            newsBudget: 5,
            newsDeliveryLimit: 5,
            newsDeliveryCount: 0,
            createdBy: req.user._id,
            newsStatus: "zugeordnet",
        }); // newNews
        newNews.save(function(err, newNewsFeed) {
            if(err) return next(err);
        }); // newNews.Save
	} // RequiNews.ForEach
}; // processNewsOrder

module.exports = {

	// order routes
	registerRoutes: function(app){
		app.get('/bestellungen/bestaetigt', qplib.checkUserRole6above, this.confirmed);
		app.get('/bestellungen', qplib.checkUserRole6above, this.home);
	},

	// order confirmed
	confirmed: function(req, res, next){
		// internal transaction execution
		// 1st check: where does user come from
		console.log('Kommt von ' + req.header('Referer'));
		if (req.header('Referer').indexOf('/warenkorb/checkout')<0) {
			req.session.flash = {
				type: 'danger',
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
				
				// check which Products where ordered
				var requiReels = 0;
				var requiNews = 0;
				for(var i=0; i < o.items.length; i++){
					if(o.items[i].prodNr =='PR1001'){
						requiReels = o.items[i].prodQuantity;
					} // if prodNr = Reel
					else if (o.items[i].prodNr == 'PR1002') {
						requiNews = o.items[i].prodQuantity;
					} // if prodNr = News
				} // for every ordered Item

				// Process Reel Order
				if (requiReels>0) {
					processReelOrder(req, requiReels, o);
				}
				// Process News Order
				if (requiNews>0){ // if Reels were ordered
					processNewsOrder (req, requiNews, user.customer);
					if (requiReels == 0) {
						o.orderStatus = 'News zugeordnet';
						o.save();
					}
				}

				// Orders have been processed therefore go to checkout and render Site
				req.session.cart = { items: [], total: 0}; //REQ.SESSION.LÖSCHEN!!!
				res.redirect(303, '/bestellungen');

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