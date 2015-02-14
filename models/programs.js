var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Reels = require('../models/reels.js');
var CUsers = require('../models/cusers.js');
var Customers = require('../models/customers.js');

var programsSchema = new Schema({
	nr: String,
	customer: { type: Schema.Types.ObjectId, ref: 'Customers'},
	programName: String,
	goalCount: Number,
	startDate: Date,
	deadlineSubmit: Date,
	deadlineScan: Date,
	created: Date,
	createdBy: { type: Schema.Types.ObjectId, ref: 'CUsers'},
	allocatedReels: [{ type: Schema.Types.ObjectId, ref: 'Reels' }],
});

var Programs = mongoose.model('Programs', programsSchema, 'programs');
module.exports = Programs;