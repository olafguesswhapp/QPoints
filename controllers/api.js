var Programs = require('../models/programs.js');
var Reels = require('../models/reels.js');
var Customers = require('../models/customers.js');
var CUsers = require('../models/cusers.js');
var qplib = require('../lib/qpointlib.js');

function publish(context, statusCode, req, res){
    console.log(context);
    res.status(statusCode).json(context);
};

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
	},

	processApiCodeScan: function(req, res, next) {
		APIUser = res.locals.apiuser;
        var statusCode = 0;
		Reels.findOne({'codes.rCode' : req.body.qpInput})
                    .populate('assignedProgram', '_id nr programName startDate deadlineSubmit goalCount programStatus programKey')
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
                                if(code.cStatus=='0'){ 
                                    code.cStatus = 1;
                                    code.consumer = APIUser;
                                    code.updated = new Date();
                                    reel.activatedCodes++; 
                                    if (reel.activatedCodes==reel.quantityCodes){
                                        reel.reelStatus='erfüllt';
                                        checkProgramsReels(reel.assignedProgram._id);
                                    } // if activatedCodes = quantityCodes
                                    reel.save(function(err) {
                                        if (err) { return next(err); }
                                    });
                                    qplib.updateUserStats(APIUser, reel.assignedProgram._id, reel.assignedProgram.goalCount);
                                    context = {
                                        success: true,
                                        name: reel.assignedProgram.programName,
                                        nr: reel.assignedProgram.nr,
                                        goalCount: reel.assignedProgram.goalCount,
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
                                } else { // if cStatus = 0
                                    context = {
                                        success: false,
                                        message: "Der QPoint " + code.rCode + " der Rolle " + reel.nr + " wurde bereits verwendet.",
                                    };
                                    statusCode = 200;
                                } // if cStatus not 0
                                publish(context, statusCode, req, res);
                            } // if qpInput
                        }); // reel.codes forEach   
                    } else { // if Dates
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
	},

};