var Orders = require('../models/orders.js');
var Products = require('../models/products.js');
var CUsers = require('../models/cusers.js');
var Reels = require('../models/reels.js');
var NewsFeed = require('../models/newsfeed.js');
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
		console.log('Kommt von ' + req.header('Referer'));
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
			
			// check which Products where ordered
			var RequiReels = 0;
			var RequiNews = 0;
			var ordersToProcess = o.items.length;
			for(var i=0; i < ordersToProcess; i++){
				if(o.items[i].prodNr =='R10001'){
					RequiReels = o.items[i].prodQuantity;
				} // if prodNr = Reel
				else if (o.items[i].prodNr == 'N50001') {
					RequiNews = o.items[i].prodQuantity;
				} // if prodNr = News
			} // for every ordered Item

			console.log('orders to process ' + ordersToProcess);
			console.log(o);

			// Process Reel Order
			if (RequiReels>0) {
				// allocate Reels
				Reels.find({ 'reelStatus': 'erfasst'}, function(err,reels){
					if (reels.length >= RequiReels) { // enoght unused reels to allocate
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
					ordersToProcess -=1;
				}); // Reels
			} // if Reels were ordered
			console.log('orders to process ' + ordersToProcess);

			// Process News Order
			if (RequiNews>0) {
				var newNews = new NewsFeed({
		            customer: user.customer,
		            // assignedProgram: null,
		            // newsTitle: null,
		            // newsMessage: req.body.newsMessage,
		            // newsStartDate: req.body.newsStartDate,
		            // newsDeadline: req.body.newsDeadline,
		            newsDeliveryLimit: 5,
		            newsDeliveryCount: 0,
		            createdBy: req.user._id,
		            newsStatus: "zugeordnet",
		        }); // newNews
		        newNews.save(function(err, newNewsFeed) {
		            if(err) return next(err);
		        });
		        ordersToProcess -=1;
			} // if News were ordered

			console.log('orders to process ' + ordersToProcess);
			if (ordersToProcess==0) {
				o.save(function(err, savedOrder){
					if(err) return next(err);
					req.session.cart = { items: [], total: 0}; //REQ.SESSION.LÖSCHEN!!!
					res.redirect(303, '/bestellungen');
				}); // Save new Ordner in DB
			} // if ordersToProcess == 0

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