var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Programs = require('../models/programs.js');
var Customers = require('../models/customers.js');
var CUsers = require('../models/cusers.js');
var uniqueValidator = require('mongoose-unique-validator');

var reelsSchema = new Schema({
	nr: String,
	reelStatus: String,
	quantityCodes: Number,
	activatedCodes: Number,
	codes: [{rCode: { type: String, unique: true }, cStatus: Number, consumer:{ type: Schema.Types.ObjectId, ref: 'CUsers'}, updated: Date}],
	created: Date,
	createdBy: { type: Schema.Types.ObjectId, ref: 'CUsers'},
	customer: { type: Schema.Types.ObjectId, ref: 'Customers'},
	assignedProgram: { type: Schema.Types.ObjectId, ref: 'Programs' },
});

// make sure rCode (barcode) is unique
reelsSchema.plugin(uniqueValidator, { message: 
	'Dieser Code (Barcode) wird bereits in einer anderen Rolle verwendet.' });


var Reels = mongoose.model('Reels', reelsSchema,'reels');
module.exports = Reels;