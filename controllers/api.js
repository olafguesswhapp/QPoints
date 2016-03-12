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

function buildResponseArray (user, req, res){
        console.log(user);
        var programData=[];
        var context = {};
        user.particiPrograms.forEach(function(particiProgram, index){
            collectProgramData (particiProgram.program, particiProgram.countPoints, particiProgram.countToRedeem, user.particiPrograms.length, index, programData, user.gender, req, res);
        });// user.particiPrograms.forEach
        return programData;
    }; // function buildResponseArray2

function collectProgramData (programId, programCount, programHit, nrOfParticiPrograms, index, programData, gender, req, res){
    Programs
            .findById(programId)
            .populate('customer')
            .exec(function(err, usersProgram){
        context = {
            programNr: usersProgram.nr,
            programName: usersProgram.programName,
            programCompany: usersProgram.customer.company,
            companyCity: usersProgram.customer.city,
            address1: usersProgram.customer.address1,
            address2: usersProgram.customer.address2,
            zip: usersProgram.customer.zip,
            city: usersProgram.customer.city,
            phone: usersProgram.customer.phone,
            programGoal: usersProgram.goalToHit, 
            myCount: programCount,
            ProgramsFinished: programHit,
            programStatus: usersProgram.programStatus,
            programStartDate: usersProgram.startDate,
            programEndDate: usersProgram.deadlineSubmit,
            programKey: usersProgram.programKey,
        }; // context
        programData.push(context);
        if (index == nrOfParticiPrograms -1 ){
            context = {
                success: true,
                message : "User-Email und Passwort sind verifiziert. Willkommen",
                gender: gender,
                programData: programData,
            }; // context
            statusCode = 200;
            publish(context, statusCode, req, res)
            console.log('erfolgreich angemeldet');
        }// if last forEach
    }); // Programs.FindById
}; // collectProgramData

module.exports = {
	registerRoutes: function(app) {
		app.post('/api/v1/codecheck', checkUser, this.processApiCodeScan);
        app.post('/api/v1/coderedeem', checkUser, this.processApiCodeRedeem);
        app.post('/api/v1/createaccount', this.processApiCreateAccount);
        app.post('/api/v1/checkuser', this.processApiCheckUserAccount);
        app.post('/api/v1/updateuser', checkUser, this.processApiUpdateUser);
	}, // module.exports

    processApiUpdateUser: function(req, res, next) {
        CUsers.findOne({'username' : req.body.userEmail}, function (err, userToFind){
            if(err) {
                context = {
                    success: false,
                    message : "Bitte melden Sie sich als User bei QPoints an - via App oder www.qpoints.net"
                };
                statusCode = 400;
                publish(context, statusCode, req, res);
            } else if (!userToFind) {// if err
                context = {
                    success: false,
                    message: "Wir konnten Sie als User nicht finden. Bitte verwenden Sie Ihre Email als User oder melden Sie sich neu an",
                };
                statusCode = 400;
                publish(context, statusCode, req, res);
            } else { // if no user
                userToFind.comparePassword(req.body.passwordOld, function(err, isMatch) {
                    if (err) {
                        console.log('Passwort stimmt nicht überein ' + err);
                        return;
                    } else if (!isMatch) {
                        context = {
                            success: false,
                            message: "Wir können das Profil aufgrund des falschen Passwortes nicht ändern",
                        };
                        statusCode = 400;
                        publish(context, statusCode, req, res);
                        return;
                    } else if (isMatch) {
                        userToFind.username = req.body.userEmail;
                        userToFind.password = req.body.passwordNew;
                        userToFind.gender = req.body.gender;
                        userToFind.save(function(err, newUser){
                            if(err) {
                                console.log('leider UserSave fehler');
                                console.log(err);
                                context = {
                                    success: false,
                                    message: 'Der User konnte nicht upgedated werden',
                                };
                                statusCode = 400;
                                publish(context, statusCode, req, res);
                            } else {
                                context = {
                                    success: true,
                                    message : "Danke, das User Profil wurde upgedated",
                                }; // context
                                statusCode = 200;
                                publish(context, statusCode, req, res)
                                console.log('User nach Update:');
                                console.log(newUser);
                            } // if save err
                        }); // user save
                    } // if isMatch
                }); // callback from user.comparePassword
            } // if user was found
        }); // CUsers.fineOne
    }, // processApiUpdateUser

    processApiCheckUserAccount: function(req, res, next) {
        console.log('API check Account startet hier');
        console.log(req.body);
        // User identifizieren
        CUsers
            .findOne({'username' : req.body.userEmail})
            .populate('particiPrograms')
            .select('password particiPrograms gender')
            .exec(function(err, checkUser){
            if(err) {
                context = {
                    success: false,
                    message : "Bitte melden Sie sich als User bei QPoints an - via App oder www.qpoints.net"
                };
                statusCode = 400;
                publish(context, statusCode, req, res);
            } else if (!checkUser) {
                context = {
                    success: false,
                    message: "Wir konnten Sie als User nicht finden. Bitte verwenden Sie Ihre Email als User oder melden Sie sich neu an",
                };
                statusCode = 400;
                publish(context, statusCode, req, res);
            } else {
                checkUser.comparePassword(req.body.password, function(err, isMatch){
                    if (err) {
                        console.log(err);
                        context = {
                            success: false,
                            message : "Bitte melden Sie sich als User bei QPoints an - via App oder www.qpoints.net"
                        };
                        statusCode = 400;
                        publish(context, statusCode, req, res);
                        return;
                    } else if (!isMatch) {
                        context = {
                            success: false,
                            message : "Das übermittelte Passwort stimmt nicht"
                        };
                        statusCode = 400;
                        publish(context, statusCode, req, res);
                        return;
                    } else {
                        if (checkUser.particiPrograms.length == 0) {
                            context = {
                                success: true,
                                message : "User-Email und Passwort sind verifiziert. Willkommen",
                                gender: checkUser.gender,
                            }; // context
                            if (!context.gender) {
                                context.gender = 0;
                            }
                            statusCode = 200;
                            publish(context, statusCode, req, res)
                            console.log('erfolgreich angemeldet - noch keine Programm-Daten vorhanden');
                            return;
                        } else {
                            buildResponseArray(checkUser, req, res);
                            return;
                        } // else
                    } // else
                }); // checkUser.comparePassword
            } // else
        }); // CUsers findOne
    }, // processApiCheckUserAccount

    processApiCreateAccount: function(req, res, next) {
        CUsers.findOne({'username' : req.body.userEmail}, function(err, user){
            if (!user) {
                console.log("User wurde bisher nicht verwendet");
                var user = new CUsers ({
                    username: req.body.userEmail,
                    password: req.body.password,
                    created: moment(new Date()).format('YYYY-MM-DDTHH:mm'),
                    role: 'consumer',
                }); // 
                user.save(function(err, newUser){
                    console.log(newUser);
                    if(err) {
                        context = {
                            success: false,
                            message: 'Der Username "' + err.errors.username.value + '" muss einmalig sein.',
                        };
                        statusCode = 400;
                        publish(context, statusCode, req, res);
                    } else {
                        context = {
                            success: true,
                            message : "Willkommen bei QPoints - vielen Dank für das Einrichten eines neuen Kontos",
                        }; // context
                        statusCode = 200;
                        publish(context, statusCode, req, res)
                        console.log('erfolgreich angelegt');
                    } // else
                }); // user.save
            } else {// if user nocht found in CUsers
                context = {
                    success: false,
                    message: 'Der Username "' + user.username + '" wird bereits verwendet.',
                }; // context
                statusCode = 400;
                publish(context, statusCode, req, res);
            } // else
        }); // CUsers.findOne
    }, // processApiCreateAccount

	processApiCodeScan: function(req, res, next) {
		APIUser = res.locals.apiuser;
        var statusCode = 0;
		Reels
            .findOne({'codes.rCode' : req.body.qpInput})
            .populate('assignedProgram', '_id nr programName startDate deadlineSubmit goalToHit programStatus programKey')
            .populate('customer')
            .exec(function(err, reel){
            if(err) {
                context = {
                success: false,
                message: "Leider ist ein Fehler aufgetreten.",
            }; // context
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
                                    // reel.save(function(err) {
                                    //     if (err) { return next(err); }
                                    // });
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
                                        message: "Wohl verdient. Der QPoint gehört zum Program " + reel.assignedProgram.programName + " (Rolle " + reel.nr + ") ",
                                        key: reel.assignedProgram.programKey, // Beispiel Code = 2T@
                                    };
                                    statusCode = 200;
                                } else { // if cStatus != 0
                                    context = {
                                        success: false,
                                        message: "Der QPoint der Rolle " + reel.nr + " wurde bereits verwendet.",
                                    };
                                    statusCode = 200;
                                } // if cStatus != 0
                                publish(context, statusCode, req, res);
                            } // if qpInput
                        }); // reel.codes forEach   
                    } else { // if Date is not valid
                        // WICHTIG! code ist hier noch nicht definiert - da noch nicht danach gesucht wurde
                        // code.cStatus = 9;
                        // code.consumer = APIUser;
                        // code.updated = new Date();
                        // reel.activatedCodes++; 
                        // if (reel.activatedCodes==reel.quantityCodes){
                        //     reel.reelStatus='erfüllt';
                        //     qplib.checkProgramsReels(reel.assignedProgram._id);
                        // } // if activatedCodes = quantityCodes
                        // reel.save(function(err) {
                        //     if (err) { return next(err); }
                        // });
                        context = {
                            success: false,
                            message : "Das Programm ist bereits abgelaufen. Der QPoint ist damit nicht mehr gültig"
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