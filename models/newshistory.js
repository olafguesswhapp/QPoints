var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var NewsFeed = require('../models/newsfeed.js');
var Customers = require('../models/customers.js');
var Programs = require('../models/programs.js');
var CUsers = require('../models/cusers.js');

var newsHistorySchema = new Schema({
	newsFeed: { type: Schema.Types.ObjectId, ref: 'NewsFeed'},
	receivedBy: { type: Schema.Types.ObjectId, ref: 'CUsers'},
	customer: { type: Schema.Types.ObjectId, ref: 'Customers'},
	assignedProgram: { type: Schema.Types.ObjectId, ref: 'Programs' },
	sendDate: Date,
});

var NewsHistory = mongoose.model('NewsHistory', newsHistorySchema, 'newsHistory');
module.exports = NewsHistory;