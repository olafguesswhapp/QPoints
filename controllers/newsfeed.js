var NewsFeed = require('../models/newsfeed.js');
var NewsHistory = require('../models/newshistory.js');
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
            console.log(checkUser);
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
					    	} // i
					    } // for i
					    for (var i=0; i<checkUser.particiPrograms.length; i++) {
					    	if (checkUser.particiPrograms[i].program.programStatus=='aktiviert') {
					    		programData.push(checkUser.particiPrograms[i].program._id);
					    	} // if
					    } // for i
					    // sort programData by programID
                    	programData.sort(function(a,b) {
                    		if(a < b){return -1} else {return 1}
                    	}); // programData.sort
                    	// delete "doubles"
                    	for (var i=0; i<programData.length;i++) {
                    		if (programData[i + 1]) {
                    			if (JSON.stringify(programData[i]) == JSON.stringify(programData[i +1])) {
	                    			programData.splice(i,1);
	                    		} // if
                    		} // if
                    	} // for i
                    	// find applicable News
                        NewsFeed.find({'assignedProgram': { $in: programData}})
                                .where('newsStatus').equals('erstellt')
                                .where('newsDeadline').gt(new Date()) // Change to "new Date (2016,1,1)" to test
                                .populate('customer', 'company')
                                .populate('assignedProgram', 'programName')
                                .exec(function(err, newsFeed){
                            var newsData = [];
                            var help = {};
                            if (err || newsFeed.length == 0) {
                                context = {
                                    success: false,
                                    message: 'Es liegen keine Nachrichten vor',
                                };
                                statusCode = 400;
                                publish(context, statusCode, req, res);
                            } else {// if
                                //Check if News was already sent
                                newsFeed.forEach(function(newsfeed, indexN){
                                    NewsHistory.findById(newsfeed._id)
                                                .where('receivedBy').equals(res.locals.apiuser)
                                                .select('receivedBy')
                                                .exec(function(err, newshistory){
                                        if (newshistory == null) {// has not been send
                                            help = {
                                                newsTitle: newsfeed.newsTitle,
                                                newsMessage: newsfeed.newsMessage,
                                                programName: newsfeed.assignedProgram.programName,
                                                company: newsfeed.customer.company,
                                            };
                                            newsData.push(help);
                                        } // if 
                                        if (indexN == newsFeed.length - 1) {
                                            context = {
                                                success: true,
                                                message: 'hat geklappt',
                                                newsFeed: newsData,
                                            };
                                            statusCode = 200;
                                            publish(context, statusCode, req, res);
                                        } // if
                                    }); // NewsHistory.findById
                                }); // newsFeed.forEach
                            } 
                        }); // NewsFeed.Find
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
                res.render('newsFeed/create', context);
                    }); // Programs.findOne
        }); // CUsers.findById
    }, // createNewsFeed

    processCreateNewsFeed: function(req, res, next) {
        console.log(req.body);
        var newNews = new NewsFeed({
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