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
        } // else
    }); // CUsers findOne
}; // checkUser

module.exports = {

	registerRoutes: function(app) {
		app.post('/api/v1/newsfeed', checkUser, this.processNewsFeedRequest);
        app.get('/news/anlegen/:nr', qplib.checkUserRole6above, this.createNewsFeed);
        app.post('/news/anlegen/:nr', qplib.checkUserRole6above, this.processCreateNewsFeed);
        app.get('/news', qplib.checkUserRole6above, this.newsLibrary);
        app.get('/news/:id', qplib.checkUserRole6above, this.newsDetail);
        app.get('/news/edit/:id', qplib.checkUserRole6above, this.newsEdit);
        app.post('/news/edit/:id', qplib.checkUserRole6above, this.processNewsEdit);
	},

	processNewsFeedRequest : function(req, res, next){
		CUsers
            .findById(res.locals.apiuser)
			.populate('particiPrograms.program', 'programStatus')
            .select('password particiPrograms.program particiPrograms.programStatus')
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
                        console.log(checkUser.particiPrograms);
         //            	for (var i=0; i<checkUser.hitGoalPrograms.length; i++) {
					    // 	if (checkUser.hitGoalPrograms[i].program.programStatus=='aktiviert') {
					    // 		programData.push(checkUser.hitGoalPrograms[i].program._id);
					    // 	} // i
					    // } // for i
					    for (var i=0; i<checkUser.particiPrograms.length; i++) {
					    	if (checkUser.particiPrograms[i].program.programStatus=='aktiviert') {
					    		programData.push(checkUser.particiPrograms[i].program._id);
					    	} // if
					    } // for i
					    // sort programData by programID
                    	// programData.sort(function(a,b) {
                    	// 	if(a < b){return -1} else {return 1}
                    	// }); // programData.sort
                    	// delete "doubles"
                    	// for (var i=0; i<programData.length;i++) {
                    	// 	if (programData[i + 1]) {
                    	// 		if (JSON.stringify(programData[i]) == JSON.stringify(programData[i +1])) {
	                    // 			programData.splice(i,1);
	                    // 		} // if
                    	// 	} // if
                    	// } // for i
                    	// find applicable News
                        NewsFeed.find({'assignedProgram': { $in: programData}})
                                .where('newsStatus').equals('erstellt')
                                .$where('this.newsDeliveryLimit > this.newsDeliveryCount')
                                .where('newsDeadline').gt(new Date()) // Change to "new Date (2016,1,1)" to test
                                .populate('customer', 'company')
                                .populate('assignedProgram', 'programName')
                                .exec(function(err, newsFeed){
                            var newsData = [];
                            var help = {};
                            if (err || newsFeed.length === 0) {
                                context = {
                                    success: false,
                                    message: 'Es liegen keine Nachrichten vor',
                                };
                                statusCode = 400;
                                publish(context, statusCode, req, res);
                            } else {// if
                                //Check if News was already sent
                                newsFeed.forEach(function(newsfeed, indexN){
                                    console.log(newsfeed._id);
                                    NewsHistory.find({'newsFeed' : newsfeed._id})
                                                .where({'receivedBy' : res.locals.apiuser })
                                                .select('_id')
                                                .exec(function(err, newshistory){
                                        if (newshistory.length === 0) {// has not been send
                                            // collect News Data to send to User
                                            help = {
                                                newsTitle: newsfeed.newsTitle,
                                                newsMessage: newsfeed.newsMessage,
                                                programName: newsfeed.assignedProgram.programName,
                                                company: newsfeed.customer.company,
                                                newsDate: moment(new Date()).format('YYYY-MM-DDTHH:mm:ss'),
                                                readStatus: false
                                            };
                                            newsData.push(help);
                                            // register news Push to newsHistory data feed
                                            newHistory = new NewsHistory ({
                                                newsFeed: newsfeed._id,
                                                receivedBy: res.locals.apiuser,
                                                customer: newsfeed.customer._id,
                                                assignedProgram: newsfeed.assignedProgram._id,
                                                sendDate: new Date(),
                                            });
                                            newHistory.save(function(err, newhistory) {
                                                if(err) return next(err);
                                            });
                                            qplib.updateNewsFeedStats(newsfeed._id);
                                        } // if
                                        // if last forEach.loop than finish API with response
                                        if (indexN == newsFeed.length - 1) {
                                            console.log('letzte prüfung');
                                            console.log(newsData);
                                            if (newsData.length === 0) {
                                                context = {
                                                    success: false,
                                                    message: 'Es liegen keine Nachrichten vor',
                                                };
                                                statusCode = 400;
                                                publish(context, statusCode, req, res);
                                            } else {
                                                context = {
                                                    success: true,
                                                    message: 'hat geklappt',
                                                    newsFeed: newsData,
                                                };
                                                statusCode = 200;
                                                publish(context, statusCode, req, res);
                                            } // newsData is not empty
                                        } // if
                                    }); // NewsHistory.findById
                                }); // newsFeed.forEach
                            } // else
                        }); // NewsFeed.Find
                    } // else
                }); // checkUser.comparePassword
            } // else if checkUser
        }); // CUsers.findById
	}, // processNewsFeedRequest

    createNewsFeed : function (req, res, next) {
        CUsers
            .findById(req.user._id)
            .populate('customer', '_id company')
            .select('_id customer customer.company')
            .exec(function(err, user) {
            Programs
                    .findOne({'nr' : req.params.nr})
                    .select('_id programName deadlineSubmit')
                    .exec(function(err, program){
                NewsFeed
                        .find({'newsStatus' : 'zugeordnet', 'customer' : user.customer._id})
                        .select('_id newsDeliveryLimit')
                        .exec(function(err, newsFeed){
                    context = {
                        newsFeedId: newsFeed[0]._id,
                        newsDeliveryLimit: newsFeed[0].newsDeliveryLimit,
                        newsBudget: newsFeed[0].newsBudget,
                        userId: user._id,
                        customerId: user.customer._id,
                        customerCompany: user.customer.company,
                        programId: program._id,
                        programNr: req.params.nr,
                        programName: program.programName,
                        dateDefault : moment(new Date()).format('YYYY-MM-DDTHH:mm'), 
                        dateDefaultDeadline: moment(program.deadlineSubmit).format('YYYY-MM-DDTHH:mm'),
                    }; // context
                    console.log(context);
                    res.render('newsFeed/create', context);
                }); // NewsFeed.find
            }); // Programs.findOne
        }); // CUsers.findById
    }, // createNewsFeed

    processCreateNewsFeed: function(req, res, next) {
        console.log(req.body);
        NewsFeed.findById(req.body.newsFeedId, function(err, newsfeed){
            newsfeed.assignedProgram = req.body.programId;
            newsfeed.newsTitle = req.body.newsTitle;
            newsfeed.newsMessage = req.body.newsMessage;
            newsfeed.newsStartDate = req.body.newsStartDate;
            newsfeed.newsDeadline = req.body.newsDeadline;
            newsfeed.newsDeliveryLimit = req.body.newsDeliveryLimit;
            newsfeed.createdBy = req.body.userId;
            newsfeed.newsStatus = 'erstellt';
            newsfeed.save(function(err, newNewsFeed) {
                if(err) return next(err);
                res.redirect(303, '/programm');
            }); // newsfeed.save
        }); // NewsFeed.FindById
    }, // processCreateNewsFeed

    // Übersicht aller angelegten Programme
    newsLibrary: function(req,res, next){
        var context = {};
        CUsers
            .findById(req.user._id)
            .populate('customer', 'id company')
            .exec(function(err, user) {     
            Programs
                .find({customer: user.customer._id})
                .select('nr programName programStatus')
                .exec(function(err, program){
                if (err || !program || program.length<1) {
                    console.log('Der User hat noch keine Programme');
                    context = {
                        customerCompany: user.customer.company,
                        programs: {
                            programName: 'Sie haben noch kein Treuepunkte-Programm gestartet',
                        }, // news
                    }; // context
                    res.render('newsFeed/library', context);
                    return;
                } else { // if error or !program found
                    context = {
                        customerCompany: user.customer.company,
                        programs: [],
                    };
                    program.forEach(function(programWithNews, indexP){
                        console.log(programWithNews.programName);
                        NewsFeed.find({assignedProgram: programWithNews._id})
                                .exec(function(err, newsFeed) {
                            var help = {
                                nr: programWithNews.nr,
                                programStatus: programWithNews.programStatus,
                                programName: programWithNews.programName,
                                programNews: newsFeed.map(function(foundNews){
                                    return {
                                        newsFeedId: foundNews._id,
                                        newsTitle: foundNews.newsTitle,
                                        newsMessage: foundNews.newsMessage,
                                        newsBudget: foundNews.newsBudget,
                                        newsDeliveryLimit: foundNews.newsDeliveryLimit,
                                        newsDeliveryCount: foundNews.newsDeliveryCount,
                                        newsStatus: foundNews.newsStatus,
                                        newsDeadline: moment(foundNews.newsDeadline).format('YYYY-MM-DD HH:mm'),
                                    } // return
                                }) // newsFeed.map
                            }; // assignedPrograms
                            context.programs[indexP] = help;
                            if (indexP == program.length - 1) {
                                console.log(context);
                                res.render('newsFeed/library', context);
                            } // if
                        }); // NewsFeed.find
                    }); // program.forEach
                } // else - program for customer was found
            }); // Programs.find
        }); // CUsers.findById
    }, // newsLibrary

    newsDetail: function (req, res, next) {
        NewsFeed
                .findById(req.params.id)
                .populate('assignedProgram', 'programName programStatus')
                .populate('customer', 'company')
                .populate('createdBy', 'firstName')
                .exec(function(err, newsfeed){
            if (err || newsfeed.length == 0) {
                req.session.flash = {
                    type: 'warning',
                    intro: 'Hinweis',
                    message: 'Diese Botschaft können wir derzeit nicht finden',
                };
                res.redirect(303, '/news');
            } // no News found
            var context = {
                newsId: req.params.id,
                customerCompany: newsfeed.customer.company,
                programName: newsfeed.assignedProgram.programName,
                programStatus: newsfeed.assignedProgram.programStatus,
                firstName: newsfeed.createdBy.firstName,
                newsTitle: newsfeed.newsTitle,
                newsMessage: newsfeed.newsMessage,
                newsStartDate: moment(newsfeed.newsStartDate).format('YYYY-MM-DDTHH:mm'),
                newsDeadline: moment(newsfeed.newsDeadline).format('YYYY-MM-DDTHH:mm'),
                newsBudget: newsfeed.newsBudget,
                newsDeliveryCount: newsfeed.newsDeliveryCount,
                newsDeliveryLimit: newsfeed.newsDeliveryLimit,
                newsStatus: newsfeed.newsStatus,
            }; // context
            res.render('newsFeed/detail', context);
        }); // NewsFeed.findById
    }, // newsDetail

    newsEdit: function (req, res, next) {
        NewsFeed
                .findById(req.params.id)
                .populate('assignedProgram', 'programName programStatus')
                .populate('customer', 'company')
                .populate('createdBy', 'firstName')
                .exec(function(err, newsfeed){
            if (err || newsfeed.length == 0) {
                req.session.flash = {
                    type: 'warning',
                    intro: 'Hinweis',
                    message: 'Diese Botschaft können wir derzeit nicht finden',
                };
                res.redirect(303, '/news');
            } // no News found
            var context = {
                newsFeedId: req.params.id,
                customerCompany: newsfeed.customer.company,
                programName: newsfeed.assignedProgram.programName,
                programStatus: newsfeed.assignedProgram.programStatus,
                firstName: newsfeed.createdBy.firstName,
                newsTitle: newsfeed.newsTitle,
                newsMessage: newsfeed.newsMessage,
                newsStartDate: moment(newsfeed.newsStartDate).format('YYYY-MM-DDTHH:mm'),
                newsDeadline: moment(newsfeed.newsDeadline).format('YYYY-MM-DDTHH:mm'),
                newsBudget: newsfeed.newsBudget,
                newsDeliveryCount: newsfeed.newsDeliveryCount,
                newsDeliveryLimit: newsfeed.newsDeliveryLimit,
                newsStatus: newsfeed.newsStatus,
            }; // context
            res.render('newsFeed/edit', context);
        }); // NewsFeed.findById
    }, // newsEdit

    processNewsEdit: function (req, res, next) {
        NewsFeed.findById(req.body.newsFeedId, function(err, newsfeed){
            newsfeed.newsTitle = req.body.newsTitle;
            newsfeed.newsMessage = req.body.newsMessage;
            newsfeed.newsDeadline = req.body.newsDeadline;
            newsfeed.newsDeliveryLimit = req.body.newsDeliveryLimit;

            newsfeed.save(function(err, newNewsFeed) {
                if(err) return next(err);
                res.redirect(303, '/news');
            }); // newsfeed.save
        }); // NewsFeed.FindById
    }, // processNewsEdit
};