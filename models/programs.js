var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Reels = require('../models/reels.js');

var programsSchema = new Schema({
	nr: String,
	customer: { type: Schema.Types.ObjectId, ref: 'Customer'},
	programName: String,
	goalCount: Number,
	startDate: Date,
	deadlineSubmit: Date,
	deadlineScan: Date,
	allocatedReels: [{ type: Schema.Types.ObjectId, ref: 'Reels' }],
});

var Programs = mongoose.model('Programs', programsSchema, 'programs');
module.exports = Programs;