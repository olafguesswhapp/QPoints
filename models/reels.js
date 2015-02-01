var mongoose = require('mongoose');

var reelsSchema = new mongoose.Schema({
	nr: String,
	reelStatus: Boolean,
	quantityCodes: Number,
	assignedProgram: String,
	codes: [{rCode: String, cStatus: Number, user: String, updated: Date}],
});

var Reels = mongoose.model('Reels', reelsSchema,'reels');
module.exports = Reels;