var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Reels = require('../models/reels.js');
var CUsers = require('../models/cusers.js');
var Customers = require('../models/customers.js');

var programsSchema = new Schema({
	nr: String,
    programStatus: String,
	customer: { type: Schema.Types.ObjectId, ref: 'Customers'},
	programName: String,
	goalCount: Number,
	startDate: Date,
	deadlineSubmit: Date,
	deadlineScan: Date, // currently not in use
	created: Date,
	createdBy: { type: Schema.Types.ObjectId, ref: 'CUsers'},
	allocatedReels: [{ type: Schema.Types.ObjectId, ref: 'Reels' }],
    programKey: String,
});

// Codes per User method
programsSchema.methods.usersNearGoal = function(cb){
	var consolidConsumer = [];
    var nrCodesPerUser = new Array;
    var nrUsersNearGoalCount = {};
    var prev;

    // across all reels asigned to the programm record the user of each
    // scanned code in the array consolidConsumer
    this.allocatedReels.forEach(function(reels){
		reels.codes.forEach(function(code){
			if (code.consumer) {
				consolidConsumer[consolidConsumer.length]=code.consumer;
			}
		}); // forEach codes
    }); // forEach AllocatedReels

    // consolidate the array to show the amount of scanned codes per user
    consolidConsumer.sort(); 
    for ( var i = 0; i < consolidConsumer.length; i++ ) {
        if ( JSON.stringify(consolidConsumer[i]) == JSON.stringify(consolidConsumer[i-1]) ) {
            nrCodesPerUser[prev].count++;
        } else {            
            nrCodesPerUser[nrCodesPerUser.length]={'user': consolidConsumer[i], 'count': 1};
        }
        prev = nrCodesPerUser.length-1;
    } // Varaiable a returns the scanned codes per User ID!

    // prepare keys inside nrUsersNearGoalCount array
    for(i=0; i < this.goalCount; i++){
        nrUsersNearGoalCount['reachedGoalm' + i] = 0;
    } // for loop to create keys within nrUsersNearGoalCount

    // how many users have reached the "goal" of codes to scan,
    // how many users are missing only 1 or 2 codes to reach the goal
    prev = this.goalCount;
    nrCodesPerUser.forEach(function(user){
        if(user.count> prev) { // Users who collected more than target
            nrUsersNearGoalCount.reachedGoalm0 =+ parseInt(user.count/prev);
            if ((user.count % prev)>0){
                nrUsersNearGoalCount['reachedGoalm' + (prev - parseInt(user.count % prev))]++;
            }
        } else { // else if Users who collected more than target
            nrUsersNearGoalCount['reachedGoalm' + (prev-user.count)]++;
        }// end if Users who collected more than target
    }); // forEach user
    return nrUsersNearGoalCount;
};

var Programs = mongoose.model('Programs', programsSchema, 'programs');
module.exports = Programs;