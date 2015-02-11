var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Programs = require('../models/programs.js');
var Customer = require('../models/customer.js');
var User = require('../models/user.js');

var reelsSchema = new Schema({
	nr: String,
	reelStatus: String,
	quantityCodes: Number,
	codes: [{rCode: String, cStatus: String, consumer: String, updated: Date}],
	created: Date,
	createdBy: { type: Schema.Types.ObjectId, ref: 'User'},
	customer: { type: Schema.Types.ObjectId, ref: 'Customer'},
	assignedProgram: { type: Schema.Types.ObjectId, ref: 'Programs' },
	
});

var Reels = mongoose.model('Reels', reelsSchema,'reels');
module.exports = Reels;