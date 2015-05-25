var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Customers = require('../models/customers.js');
var Programs = require('../models/programs.js');
var CUsers = require('../models/cusers.js');

var newsFeedSchema = new Schema({
	customer: { type: Schema.Types.ObjectId, ref: 'Customers'},
	assignedProgram: { type: Schema.Types.ObjectId, ref: 'Programs' },
	newsTitle: String,
	newsMessage: String,
	newsStartDate: Date,
	newsDeadline: Date,
	newsDeliveryLimit: Number,
	newsDeliveryCount: Number,
	createdBy: { type: Schema.Types.ObjectId, ref: 'CUsers'},
	newsStatus: String,
});

var NewsFeed = mongoose.model('NewsFeed', newsFeedSchema, 'newsFeed');
module.exports = NewsFeed;
