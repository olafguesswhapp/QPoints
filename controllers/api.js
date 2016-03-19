var Programs = require('../models/programs.js');
var Reels = require('../models/reels.js');
var Customers = require('../models/customers.js');
var CUsers = require('../models/cusers.js');
var qplib = require('../lib/qpointlib.js');
var moment = require('moment');

function publish(context, statusCode, req, res){
    console.log(context);
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, ORIGIN');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if ('OPTIONS' == req.method) {
      res.send(200);
    } else {
      res.status(statusCode).json(context);
    }
}; // pubilsh

function checkUser(req, res, next) {
	console.log(req.body);
    // User identifizieren
    CUsers.findOne({'username' : req.body.userEmail}, '_id', function(err, user){
        if(err) {
            context = {
                success: false,
                message : "Bitte melden Sie sich als User bei QPoints an - via App oder www.qpoints.net"
            };
            statusCode = 400;
            publish(context, statusCode, req, res);
        } else if (!user) {
            context = {
                success: false,
                message: "Wir konnten Sie als User nicht finden. Bitte verwenden Sie Ihre Email als User oder melden Sie sich neu an",
            };
            statusCode = 400;
            publish(context, statusCode, req, res);
        } else {
            res.locals.apiuser = user._id;
            return next();
        } // else
    }); // CUsers findOne
}; // checkUser

module.exports = {
	registerRoutes: function(app) {
        app.post('/api/v1/coderedeem', checkUser, this.processApiCodeRedeem);
	}, // module.exports

    processApiCodeRedeem: function (req, res, next){
        // APIUser = res.locals.apiuser; var indexEditedCodes = req.body.programGoal; var reelIdArray = [];
        Programs.findOne({'nr' : req.body.programNr}, function(err, programs){
            if (err || !programs || !programs.allocatedReels){ // if Program ist nicht vorhanden
                console.log(err);
                console.log(programs);
                context = {
                    success: false,
                    programName: "Program Unbekannt",
                    message : "Auf diesem Program darf es keine zu sammelnde Punkte geben",
                }; // context
                statusCode = 400;
                publish(context, statusCode, req, res);
                return;
            } else if (req.body.programGoal != programs.goalToHit) {
                context = {
                    success: false,
                    programName: programs.programName,
                    requestGoalToHit: req.body.programGoal,
                    programGoalToHit: programs.goalToHit,
                    message : "Bitte sprechen Sie den Ladeninhaber an welches die gezielten Zielpunkte sind",
                }; // context
                statusCode = 400;
                publish(context, statusCode, req, res);
                return;
            } else { // if Program ist nicht vorhanden oder DOCH vorhanden (=normal)
                checkCodesInReels(programs._id, req, res);
            } // if Program ist doch vorhanden (kein err in Programs find)
        }); // Programs find
    }, // Function processApiCodeRedeem

}; // module Exports

function checkCodesInReels (programId, req, res){
    var codesArray = [];
    var counter =  req.body.programGoal;
    var helpIndex = 0;
    Reels
        .find({'assignedProgram' : programId })
        .select('_id codes.rCode codes.cStatus codes.consumer')
        .exec(function(err, reels){
        reels.forEach(function(reel, index){
            var reelId = reel._id;
            reel.codes.forEach(function(reelcode){
                if (reelcode.cStatus==1 && counter!= 0 && JSON.stringify(reelcode.consumer) == JSON.stringify(res.locals.apiuser)){
                    var codesArrayIndex = Object.keys(codesArray).length;
                    if (codesArrayIndex == 0 || Object.keys(codesArray)[codesArrayIndex - 1] != reelId){
                        codesArray[reelId] = [{ rCode: reelcode.rCode}];
                    } else {
                        var objArray = { rCode: reelcode.rCode};
                        codesArray[reelId].push(objArray);
                    } // else
                    counter--;
                } //  if cStatus = 1
            }); // reels.forEach
            helpIndex = index;
        }); // reels.forEach
        if (helpIndex == reels.length-1){
            if (counter != 0){
                context = {
                    success: false,
                    programNr: req.body.programNr,
                    message : "Für dieses Program liegen nicht genug Punkte vor.",
                }; // context
                statusCode = 400;
                publish(context, statusCode, req, res);
                return;
            } else {
                console.log('super!');
                updateUserStats(programId, codesArray, req, res);
            } // else
        } // wir sind am Ende
    }); // Reels.find
}; // checkCodesInReels

function updateUserStats(programId, codesArray, req, res){
    var correctUser = false;
    var didRun = false;
    CUsers.findById(res.locals.apiuser, 'particiPrograms', function(err, cUser){
        // Update countToRedeem Stats of User (decrease)
        cUser.particiPrograms.forEach(function(program){
            if (JSON.stringify(program.program) == JSON.stringify(programId) ){
                console.log('gefunden');
                correctUser = true;
                program.countToRedeem--; // countToRedeem Stats decrease (since codes are beeing redeemed)
                // program.countCashed++;
            } // found redeemed Program
        }); // particiPrograms.forEach
        cUser.save(function(err){
            if (err) { return err;}
        }); // save updated User Stats
        if (correctUser) {
            if (didRun==false){updateProgramStats(codesArray, req, res);}
            didRun=true;
        } // if
        return;
    }); // CUsers findById
}; // updateUserStats

function updateProgramStats(codesArray, req, res){
    Programs.findOne({'nr' : req.body.programNr}, function(err, updateProgram){
        console.log(updateProgram);
        updateProgram.hitGoalsCount--;
        updateProgram.redeemCount++;
        console.log(updateProgram);
        updateProgram.save(function(err){
            if (err) { return next(err);}
        }); // save updated User Stats
        context = {
            success: true,
            message : "Herzliche Glückwünsche, Punkte wurden eingelöst",
            programName: updateProgram.programName,
            hitGoalsCount: updateProgram.hitGoalsCount,
            redeemCount: updateProgram.redeemCount,
        }; // context
        statusCode = 200;
        publish(context, statusCode, req, res)
        console.log('und jetzt geht es zu markCodesInReel');
        markCodesInReel(codesArray, req, res);
        return;
    }); // Program FindOne
}; // updateProgramStats

function markCodesInReel(codesArray, req, res) {
    for (var i = 0; i<Object.keys(codesArray).length; i++){
        var reelId =Object.keys(codesArray)[i]; 
        var reelArray = codesArray[reelId];
        markEachCode(reelId, reelArray);
    } // for i (number of reels in codesArray)
}; // markEachCode

function markEachCode(reelId, reelArray) {
    var changedReel = false;
    Reels.findById(reelId, 'codes', function(err, reels){
        var codeIndex = 0;
        reels.codes.forEach(function(reel){
            if (codeIndex<reelArray.length) {
                if (reel.rCode == reelArray[codeIndex].rCode) {
                    reel.cStatus = 2;
                    changedReel = true;
                    codeIndex++;
                    console.log('found ' + reel.rCode);
                } // found rCode
            } // if codeIndex within reelArray Index
        }); // forEach reels.code
        if (changedReel=true) {
            reels.save(function(err){
                if (err) { return next(err);}
            }); // save updated User Stats
        } // changedReel = true
    }); // Reels.findById
}; // markEachCode