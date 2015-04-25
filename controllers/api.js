var Programs = require('../models/programs.js');
var Reels = require('../models/reels.js');
var Customers = require('../models/customers.js');
var CUsers = require('../models/cusers.js');
var qplib = require('../lib/qpointlib.js');

function publish(context, statusCode, req, res){
    console.log(context);
    res.status(statusCode).json(context);
}; // pubilsh

function markEachCode(reelId, indexEditedCodes, APIUser) {
    Reels.findById(reelId, function(err, reel){
        reel.codes.forEach(function(codesInReel){
            if (indexEditedCodes != 0 && codesInReel.cStatus == 1 && JSON.stringify(APIUser)==JSON.stringify(codesInReel.consumer)) {
                indexEditedCodes--; // mark only required number of codes to be redeemed (therefore the index)
                codesInReel.cStatus = 2; // Edit status of Code to "redeem = 2"
            }
        }); // codes.forEach
        reel.save(function(err) {
            if (err) { return next(err); }
        });
    }); // Reels findById
    return indexEditedCodes;
};

function updateUserStats(APIUser, programId, programNr, callback){
    var correctUser = false;
    CUsers.findById(APIUser, function(err, cUser){
        // Update HitGoalStats of User (decrease)
        cUser.hitGoalPrograms.forEach(function(progHitGoal){
            if (JSON.stringify(progHitGoal.program)==JSON.stringify(programId)){
                correctUser = true;
                progHitGoal.hitGoalCount--; // HitGoal Stats decrease (since codes are beeing redeemed)
            } // found redeemed Program
        }); // hitGoalProgram.forEach
        // Update RedeemStats of User (Increase)
        var firstTime = true; // marks if this User has redeemd this program for the 1st time
        cUser.redeemPrograms.forEach(function(redeemProgram){
            if(JSON.stringify(redeemProgram.program)==JSON.stringify(programId)){
                redeemProgram.redeemCount++;
                firstTime= false; // yes, User did already redeem this Program once before (only increase counter)
            } // if User already has redeemd in the program
        }); // forEach redeemProgram
        if (firstTime==true){ // it is the 1st time
            var programArray = {
                program: programId,
                redeemCount: 1
            };
            cUser.redeemPrograms.push(programArray);
        } // it is the 1st time
        cUser.save(function(err){
            if (err) { return next(err);}
        }); // save updated User Stats
        if (correctUser) {
            callback(programNr);
        } else {
            return false;
        }
        return;
    }); // CUsers findById
}; // updateUserStats

function updateProgramStats(programNr){
    var programArray = [];
    Programs.findOne({'nr' : programNr}, function(err, updateProgram){
        updateProgram.hitGoalsCount--;
        updateProgram.redeemCount++;
        programArray = {
            programName: updateProgram.programName,
            hitGoalsCount: updateProgram.hitGoalsCount,
            redeemCount: updateProgram.redeemCount,
        };
        updateProgram.save(function(err){
            if (err) { return next(err);}
        }); // save updated User Stats
        console.log('vor rückehr vom Callback');
        console.log(programArray);
        return programArray;
    }); // Program FindOne
}; // updateProgramStats

function checkUser(req, res, next) {
	console.log(req.body);
    // User identifizieren
    CUsers.findOne({'username' : req.body.user}, '_id', function(err, user){
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
        }
    }); // CUsers findOne
};

module.exports = {

	registerRoutes: function(app) {
		app.post('/apicodecheck', checkUser, this.processApiCodeScan);
        app.post('/apicoderedeem', checkUser, this.processApiCodeRedeem);
	},

	processApiCodeScan: function(req, res, next) {
		APIUser = res.locals.apiuser;
        var statusCode = 0;
		Reels.findOne({'codes.rCode' : req.body.qpInput})
                    .populate('assignedProgram', '_id nr programName startDate deadlineSubmit goalToHit programStatus programKey')
                    .populate('customer')
                    .exec(function(err, reel){
            if(err) {
                context = {
                success: false,
                message: "Leider ist ein Fehler aufgetreten.",
            };
            statusCode = 400;
            publish(context, statusCode, req, res);
            } // if err
            if (!reel) {
                context = {
                    success: false,
                    message: "Dieser QPoint ist nicht vorhanden.", 
                };
                statusCode = 400;
                publish(context, statusCode, req, res);
            } else {// if !reel
                // gefunden
                if (reel.reelStatus == "aktiviert"){
                    if(new Date()<= reel.assignedProgram.deadlineSubmit){
                        reel.codes.forEach(function(code){
                            if (code.rCode == req.body.qpInput){
                                if(code.cStatus==0){ 
                                    code.cStatus = 1;
                                    code.consumer = APIUser;
                                    code.updated = new Date();
                                    reel.activatedCodes++;
                                    if (reel.activatedCodes==reel.quantityCodes){
                                        reel.reelStatus='erfüllt';
                                        qplib.checkProgramsReels(reel.assignedProgram._id);
                                    } // if activatedCodes = quantityCodes
                                    reel.save(function(err) {
                                        if (err) { return next(err); }
                                    });
                                    qplib.updateUserStats(APIUser, reel.assignedProgram._id, reel.assignedProgram.goalToHit);
                                    context = {
                                        success: true,
                                        name: reel.assignedProgram.programName,
                                        nr: reel.assignedProgram.nr,
                                        goalToHit: reel.assignedProgram.goalToHit,
                                        programStatus: reel.assignedProgram.programStatus,
                                        startDate: reel.assignedProgram.startDate,
                                        endDate: reel.assignedProgram.deadlineSubmit,
                                        company: reel.customer.company,
                                        address1: reel.customer.address1,
                                        address2: reel.customer.address2,
                                        city: reel.customer.city,
                                        zip: reel.customer.zip,
                                        country: reel.customer.country,
                                        phone: reel.customer.phone,
                                        message: "Der QPoint " + code.rCode  + "gehört zum Program " + reel.assignedProgram.programName + " (Rolle " + reel.nr + ") ",
                                        key: reel.assignedProgram.programKey, // Beispiel Code = 2T@
                                    };
                                    statusCode = 200;
                                } else { // if cStatus != 0
                                    context = {
                                        success: false,
                                        message: "Der QPoint " + code.rCode + " der Rolle " + reel.nr + " wurde bereits verwendet.",
                                    };
                                    statusCode = 200;
                                } // if cStatus != 0
                                publish(context, statusCode, req, res);
                            } // if qpInput
                        }); // reel.codes forEach   
                    } else { // if Date is not valid
                        code.cStatus = 9;
                        code.consumer = APIUser;
                        code.updated = new Date();
                        reel.activatedCodes++; 
                        if (reel.activatedCodes==reel.quantityCodes){
                            reel.reelStatus='erfüllt';
                            qplib.checkProgramsReels(reel.assignedProgram._id);
                        } // if activatedCodes = quantityCodes
                        reel.save(function(err) {
                            if (err) { return next(err); }
                        });
                        context = {
                            success: false,
                            message : "Das Programm ist bereits abgelaufen. Die Rolle ist damit nicht mehr gültig"
                        };
                        statusCode = 400;
                        publish(context, statusCode, req, res);
                    } // else if Dates
                } else {// if reel = aktiviert
                context = {
                    success: false,
                    message : "Der QPoint wurde noch nicht einem Programm zugeordnet, Bitte wenden Sie sich an den Ladeninhaber"
                };
                statusCode = 400;
                publish(context, statusCode, req, res);
                } // if else reels nicht aktiviert
            } // if else = reels gefunden
        }); // Reels find
	}, // Function processApiCodeScan

    processApiCodeRedeem: function (req, res, next){
        APIUser = res.locals.apiuser;
        var indexEditedCodes = req.body.programGoal;
        var reelIdArray = [];
        Programs.findOne({'nr' : req.body.programNr}, function(err, programs){
            reelIdArray = programs.allocatedReels.map(function(allocatedReel){
                return allocatedReel;
            }); // map programs
            reelIdArray.forEach(function(reelId, index){
                if (indexEditedCodes != 0) {
                    indexEditedCodes = markEachCode(reelId, indexEditedCodes, APIUser);
                } // if counter 1= 0
                if (index == reelIdArray.length-1){ // perform next Step (in sync) after ForEach Index complete
                    updateUserStats(APIUser, programs._id, req.body.programNr, updateProgramStats)
                    console.log('bis hier zurück?');
                    context = {
                        success: true,
                        message : "Herzliche Glückwünsche, Punkte wurden eingelöst",
                        reels: reelIdArray,
                    }; // context
                    statusCode = 200;
                    publish(context, statusCode, req, res);
                }
            }); // allocReels.forEach
        }); // Programs find

                // context = {
                //     success: false,
                //     programName: programs.programName,
                //     message : req.body.user + ' hat noch nicht genug Punkt für Einlösung gesammelt',
                // }; // context
                // statusCode = 400;
                // publish(context, statusCode, req, res);

                // context = {
                //     success: false,
                //     programName: programs.programName,
                //     message : "Wir konnten nicht genug dem User und Program zugeordnete & eingelöst Punkte finden",
                //     reels: allocReels,
                // }; // context
                // statusCode = 400;
                // publish(context, statusCode, req, res);

    }, // Function processApiCodeRedeem

};