var CUsers = require('../models/cusers.js');

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
                        updateUserfinishedStats(userId, programId);
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

// when a user reached a program's goal updated the users finished stats
updateUserfinishedStats = function(userId, programId){
    CUsers.findById(userId)
        .populate('finishedPrograms.program', '_id')
        .exec(function(err, user){
        var i = true;
        var progArray = new Array;
        user.finishedPrograms.forEach(function(finishedProgram){
            if(JSON.stringify(finishedProgram.program._id)==JSON.stringify(programId)){
                finishedProgram.finishedCount++;
                i=false;
            } // User already has reached once goal in program
        }); // forEach finishedProgram
        if (i==true){ // 1st time goal in this program has been reached
            progArray={
                program: programId,
                finishedCount: 1
            };
            user.finishedPrograms.push(progArray);
        } // 1st time goal in this program has been reached
        user.save(function(err){
            if (err) { return next(err);}
        }); // save updated User Stats
    }); // CUsersFind
}; // function updateUserFinishedStats


