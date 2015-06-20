var CUsers = require('../models/cusers.js');
var Programs = require('../models/programs.js');
var NewsFeed = require('../models/newsfeed.js');

// when a code is scanned update the code/program in the stats of the user
exports.updateUserStats = function(userId, programId, goalToHit){
    CUsers.findById(userId)
        .populate('particiPrograms.program', '_id')
        .exec(function(err, user){
            var i = true;
            var progArray = new Array;
            user.particiPrograms.forEach(function(particiProgram){
                if(JSON.stringify(particiProgram.program._id)==JSON.stringify(programId)){ // does User already participate in Program?
                    particiProgram.count++;
                    i= false;
                    if(particiProgram.count==goalToHit){
                        particiProgram.count = 0;
                        console.log("Wechsel zu updateUserHitGoalStats")
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
    console.log("Jetzt wird die Program-Statistik updated");
    Programs.findById(programId, function(err, program) {
        console.log(program);
        program.hitGoalsCount++;
        console.log(program);
        program.save(function(err){
            if (err) { return next(err);}
        }); // program updated hitGoalStat
    }); // Programs findById
}; // function updateUserHitGoalStats

// Check whether Program still does have reel with free codes
exports.checkProgramsReels = function(programId, cb){
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

exports.updateNewsFeedStats = function (newsFeedId) {
    NewsFeed.findById(newsFeedId)
            .select('newsDeliveryCount newsDeliveryLimit newsStatus')
            .exec(function(err, newsfeed){
                newsfeed.newsDeliveryCount +=1;
                if (newsfeed.newsDeliveryCount == newsfeed.newsDeliveryLimit){
                    newsfeed.newsStatus = 'aufgebraucht';
                } // if
                newsfeed.save(function(err){
                        if (err) {
                            console.log(err);
                            return;
                        }
                    });
            }); // NewsFeed.findById
}; // updateNewsFeedStats

exports.adminOnly = function (req, res, next) {
    if (Object.keys(req.session.passport).length > 0) {
        CUsers.findById(req.session.passport.user, function(err, user){
            if(user.role==='admin') {return next();
            } else {
                req.session.flash = {
                    type: 'Warnung',
                    intro: 'Sie haben nicht das Recht Produkte anzulegen .',
                    message: 'Bitte wenden Sie sich an unsere Administration.'
                };
                res.redirect('/produkte');
            }
        });
    } else { 
        res.redirect('/login');
    }
};
