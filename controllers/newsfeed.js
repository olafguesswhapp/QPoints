var newsFeed = require('../models/newsfeed.js');
var Programs = require('../models/programs.js');
var Customers = require('../models/customers.js');
var CUsers = require('../models/cusers.js');
var qplib = require('../lib/qpointlib.js');
var moment = require('moment');

function publish(context, statusCode, req, res){
    console.log(context);
    res.status(statusCode).json(context);
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
        }
    }); // CUsers findOne
}; // checkUser

module.exports = {

	registerRoutes: function(app) {
		app.post('/apinewsfeed', checkUser, this.processNewsFeedRequest);
        app.get('/news/anlegen/:nr', this.createNewsFeed);
        app.post('/news/anlegen/:nr', this.processCreateNewsFeed);
	},

	processNewsFeedRequest : function(req, res, next){
		CUsers.findById(res.locals.apiuser)
				.populate('particiPrograms.program', 'programStatus')
				.populate('hitGoalPrograms.program', 'programStatus')
                .select('password particiPrograms.program particiPrograms.programStatus hitGoalPrograms.program hitGoalPrograms.programStatus')
                .exec(function(err, checkUser){
        	if (!checkUser) {
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
                    	// concatenate particiPrograms and hitGoalPrograms
                    	var programData = [];
                    	for (var i=0; i<checkUser.hitGoalPrograms.length; i++) {
					    	if (checkUser.hitGoalPrograms[i].program.programStatus=='aktiviert') {
					    		programData.push(checkUser.hitGoalPrograms[i].program._id);
					    	}
					    }
					    for (var i=0; i<checkUser.particiPrograms.length; i++) {
					    	if (checkUser.particiPrograms[i].program.programStatus=='aktiviert') {
					    		programData.push(checkUser.particiPrograms[i].program._id);
					    	}
					    }
					    // sort programData by programID
                    	programData.sort(function(a,b) {
                    		if(a < b){return -1} else {return 1}
                    	});
                    	// delete "doubles"
                    	for (var i=0; i<programData.length;i++) {
                    		if (programData[i + 1]) {
                    			if (JSON.stringify(programData[i]) == JSON.stringify(programData[i +1])) {
	                    			programData.splice(i,1);
	                    		}
                    		}
                    	}
                    	console.log(programData);

                    	context = {
                    		success: true,
                    		message: 'hat geklappt',
                    	};
                    	statusCode = 200;
                    	publish(context, statusCode, req, res);
                    }
                }); // checkUser.comparePassword
            } // else if checkUser
        }); // CUsers.findById
	}, // processNewsFeedRequest

    createNewsFeed : function (req, res, next) {
        CUsers.findById(req.user._id)
                .populate('customer', '_id company')
                .select('_id customer customer.company')
                .exec(function(err, user) {
            Programs.findOne({'nr' : req.params.nr})
                    .select('_id programName deadlineSubmit')
                    .exec(function(err, program){
                context = {
                    userId: user._id,
                    customerId: user.customer._id,
                    customerCompany: user.customer.company,
                    programId: program._id,
                    programNr: req.params.nr,
                    programName: program.programName,
                    dateDefault : moment(new Date()).format('YYYY-MM-DD HH:mm'),
                    dateDefaultDeadline: moment(program.deadlineSubmit).format('YYYY-MM-DD HH:mm'),
                }; // context
                console.log(context);
                res.render('newsFeed/create', context);
                    }); // Programs.findOne
        }); // CUsers.findById
    }, // createNewsFeed

    processCreateNewsFeed: function(req, res, next) {
        console.log(req.body);
        var newNews = new newsFeed({
            customer: req.body.customerId,
            assignedProgram: req.body.programId,
            newsTitle: req.body.newsTitle,
            newsMessage: req.body.newsMessage,
            newsStartDate: req.body.newsStartDate,
            newsDeadline: req.body.newsDeadline,
            newsDeliveryLimit: req.body.newsDeliveryLimit,
            createdBy: req.body.userId,
            newsStatus: "erstellt",
        });
        newNews.save(function(err, newNewsFeed) {
            if(err) return next(err);
            res.redirect(303, '/programm');
        });
    }, // processCreateNewsFeed
};