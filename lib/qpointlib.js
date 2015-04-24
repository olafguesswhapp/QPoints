var CUsers = require('../models/cusers.js');
var Programs = require('../models/programs.js');

// when a code is scanned update the code/program in the stats of the user
exports.updateUserStats = function(userId, programId, goalCount){
    CUsers.findById(userId)
        .populate('particiPrograms.program', '_id')
        .exec(function(err, user){
            var i = true;
            var progArray = new Array;
            user.particiPrograms.forEach(function(particiProgram){
                if(JSON.stringify(particiProgram.program._id)==JSON.stringify(programId)){ // does User already participate in Program?
                    particiProgram.count++;
                    i= false;
                    if(particiProgram.count==goalCount){
                        particiProgram.count = 0;
                        updateUserHitGoalStats(userId, programId);
                    } // with new Code goal has been acchieved
                } // if User already participates in the program
            }); // forEach particiProgram
            if (i==true){ // 1st Program Code - therefore expand User Stats
                progArray = {
                    program: programId,
                    count: 1
                };
                user.particiPrograms.push(progArray);
            } // 1st Program Code - therefore expand User Stats
            user.save(function(err){
                if (err) { return next(err);}
            }); // save updated User Stats
        }); // CUserFind
}; // function update User Stats with scanned Program codes

// when a user reached a program's goal updated the users hitGoal stats
updateUserHitGoalStats = function(userId, programId){
    CUsers.findById(userId)
        .populate('hitGoalPrograms.program', '_id')
        .exec(function(err, user){
        var i = true;
        var progArray = new Array;
        user.hitGoalPrograms.forEach(function(hitGoalProgram){
            if(JSON.stringify(hitGoalProgram.program._id)==JSON.stringify(programId)){
                hitGoalProgram.hitGoalCount++;
                i=false;
            } // User already has reached once goal in program
        }); // forEach hitGoalProgram
        if (i==true){ // 1st time goal in this program has been reached
            progArray={
                program: programId,
                hitGoalCount: 1
            };
            user.hitGoalPrograms.push(progArray);
        } // 1st time goal in this program has been reached
        user.save(function(err){
            if (err) { return next(err);}
        }); // save updated User Stats
    }); // CUsersFind
}; // function updateUserFinishedStats

// Check whether Program still does have reel with free codes
checkProgramsReels = function(programId, cb){
    var progReelStatus = true;
    Programs.findById(programId)
            .populate('allocatedReels', 'nr reelStatus')
            .exec(function(err, program){       
        program.allocatedReels.forEach(function(reels){
            if (reels.reelStatus=='erfüllt') {progReelStatus=false;}
        }); // forEach AllocatedReels
        if (progReelStatus == false) {
                    program.programStatus = 'inaktiv';
                    program.save(function(err){
                        if (err) { return next(err); }
                    });
        } // end if progReelStatus=false
    }); // Users find
}; // function checkProgramsReels

