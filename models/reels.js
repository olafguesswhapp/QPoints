var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Programs = require('../models/programs.js');
var Customers = require('../models/customers.js');
var CUsers = require('../models/cusers.js');

var reelsSchema = new Schema({
	nr: String,
	reelStatus: String,
	quantityCodes: Number,
	codes: [{rCode: String, cStatus: String, consumer: String, updated: Date}],
	created: Date,
	createdBy: { type: Schema.Types.ObjectId, ref: 'CUsers'},
	customer: { type: Schema.Types.ObjectId, ref: 'Customers'},
	assignedProgram: { type: Schema.Types.ObjectId, ref: 'Programs' },
	
});

var Reels = mongoose.model('Reels', reelsSchema,'reels');
module.exports = Reels;