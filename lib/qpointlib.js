var CUsers = require('../models/cusers.js');
var Programs = require('../models/programs.js');
var NewsFeed = require('../models/newsfeed.js');

exports.defineRole = function (req){
    if (!req.user){
        return 0;
    } else {
        switch(req.user.role) {
            case 'admin':
                return 10;
            case 'customer':
                return 8;
            case 'user':
                return 6;
            case 'consumer':
                return 3;
            default:
                return 0;
        } // switch
    } // else
}; // defineRole

exports.defineNav = function (req, res) {
    var endIndex = req.path.indexOf('/', 1);
    var endIndex2=0;
    var current2ndPath = "";
    if (endIndex < 0) {endIndex = req.path.length;}
    var currentPath = req.path.substring(1, endIndex);
    if (currentPath == 'meinepunkte') {
        endIndex2 = req.path.indexOf('/', endIndex +1);
        if (endIndex2 < 0) {endIndex2 = req.path.length;}
        current2ndPath  = req.path.substring(endIndex + 1, endIndex2);
    }
    switch(currentPath) {
        case 'programm':
            res.locals.navProgram =  'class="active"';
            res.locals.current = 'myPrograms';
            break;
        case 'rollen':
            res.locals.navProgram ='class="active"';
            res.locals.current = 'myReels';
            break;
        case 'news':
            res.locals.navProgram = 'class="active"';
            res.locals.current = 'myNews';
            break;
        case 'user':
            res.locals.navAccount = 'class="active"';
            res.locals.current = 'user';
            break;
        case 'kunden':
            res.locals.navAccount = 'class="active"';
            res.locals.current = 'client';
            break;
        case 'bestellungen':
            res.locals.navAccount = 'class="active"';
            res.locals.current = 'order';
            break;
        case 'meinepunkte':
            res.locals.meinepunkte = 'class="active"';
            res.locals.current = 'mypoints';
            if (current2ndPath == 'news') {res.locals.current = 'news';}
            if (current2ndPath == 'scan') {res.locals.current = 'scan';}
        default:
    } // swith
    return;
}; // defineNav

exports.adminOnly = function (req, res, next) {
    // req.session.lastPage = req.path;
    if (res.locals.roleLevel > 9){
        return next();
    } else {
        req.session.flash = {
            type: 'Warnung',
            intro: 'Sie haben nicht das Recht auf diese Seite zuzugreifen.',
            message: 'Bitte wenden Sie sich an unsere Administration.'
        };
        if (req.session.lastPage == req.path) {
            res.redirect('/');
        } else {
            res.redirect(req.session.lastPage);
        } // else
    } // else
}; // adminOnly 

exports.checkUserRole8above = function (req, res, next) {
    if (res.locals.roleLevel > 7){
        return next();
    } else if (res.locals.roleLevel > 0){
        req.session.flash = {
            type: 'Warnung',
            intro: 'Sie sind nicht als Betriebs-Inhaber angelegt.',
            message: 'Bitte kontaktieren Sie ggfs. Ihren Inhaber um Ihre Rolle zu ändern.'
        };
        res.redirect('/');
    } else {
        req.session.flash = {
            type: 'Warnung',
            intro: 'Sie müssen bitte als User eingelogged sein.',
            message: 'Bitte melden Sie sich mit Ihrem Email und Passwort an.'
        };
        res.redirect('/login');
    } // else
}; // checkUserRole8above

exports.checkUserRole6above = function (req, res, next) {
    if (res.locals.roleLevel > 5){
        return next();
    } else if (res.locals.roleLevel > 0){
        req.session.flash = {
            type: 'Warnung',
            intro: 'Sie sind nicht als Programm-User (Inhaber/Verwalter von Treuepunkte-Programmen) angelegt.',
            message: 'Sie dürfen QPoints aber erhalten, sammeln und einreichen.'
        };
        res.redirect('/');
    } else {
        req.session.flash = {
            type: 'Warnung',
            intro: 'Sie müssen bitte als User eingelogged sein.',
            message: 'Bitte melden Sie sich mit Ihrem Email und Passwort an.'
        };
        res.redirect('/login');
    } // else
}; // checkUserRole6above

exports.checkUserRole3above = function (req, res, next) {
    if (res.locals.roleLevel > 0) {
        return next();
    } else {
        req.session.flash = {
            type: 'Warnung',
            intro: 'Sie müssen bitte als User eingelogged sein.',
            message: 'Bitte melden Sie sich mit Ihrer Email und Passwort an.',
        };
        req.session.lastPage = req.path;
        res.redirect(303, '/login');
    } // else
}; // checkUserRole3above

// when a code is scanned update the code/program in the stats of the user
exports.updateUserStats = function(userId, programId, goalToHit){
    CUsers.findById(userId)
        .populate('particiPrograms.program', '_id')
        .exec(function(err, user){
            var i = true;
            var progArray = new Array;
            user.particiPrograms.forEach(function(particiProgram){
                if(JSON.stringify(particiProgram.program._id)==JSON.stringify(programId)){ // does User already participate in Program?
                    particiProgram.countPoints++;
                    i= false;
                    if(particiProgram.countPoints == goalToHit){
                        particiProgram.countPoints = 0;
                        particiProgram.countToRedeem++;
                        updateUserHitGoalStats(userId, programId);
                    } // with new Code goal has been acchieved
                } // if User already participates in the program
            }); // forEach particiProgram
            if (i==true){ // 1st Program Code - therefore expand User Stats
                progArray = {
                    program: programId,
                    countPoints: 1,
                    countToRedeem: 0
                };
                user.particiPrograms.push(progArray);
            } // 1st Program Code - therefore expand User Stats
            user.save(function(err){
                if (err) { return err;}
            }); // save updated User Stats
        }); // CUserFind
}; // function update User Stats with scanned Program codes

// when a user reached a program's goal updated the users hitGoal stats
updateUserHitGoalStats = function(userId, programId){
    Programs.findById(programId, function(err, program) {
        program.hitGoalsCount++;
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

