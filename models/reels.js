var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Programs = require('../models/programs.js');

var reelsSchema = new Schema({
	nr: String,
	reelStatus: Boolean,
	quantityCodes: Number,
	assignedProgram: { type: Schema.Types.ObjectId, ref: 'Programs' },
	codes: [{rCode: String, cStatus: Number, user: String, updated: Date}],
});

var Reels = mongoose.model('Reels', reelsSchema,'reels');
module.exports = Reels;