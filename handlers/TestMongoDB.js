var TestDB = require('../models/testDB.js');
var CUsers = require('../models/cusers.js');
var Programs = require('../models/programs.js');
var Reels = require('../models/reels.js');
var Customers = require('../models/customers.js');
var moment = require('moment');

//testen Sessions Merken
exports.wahl = function(req,res){
    console.log(req.params.wahl);
    req.session.wahl = req.params.wahl;
    return res.redirect(303, '/testMongo');
};

//testen MongoDB
exports.testMongo = function(req, res){
    var wahl = req.session.wahl;
    TestDB.find({}, function(err, tests){
        var context = {
            wahl: wahl,
            tests: tests.map(function(test){
                return {
                    a: test.a,
                    b: test.b,
                }
            })
        };
        switch(wahl){
            case '1': context.wahl1 = 'selected'; break;
            case '2': context.wahl2 = 'selected'; break;
            case '3': context.wahl3 = 'selected'; break;
        }
        res.render('testMongo', context);
    });
};

// test JSON endpoint
exports.testapi = function(req, res) {
  CUsers.find({}, function(err, users) {
    if(!err){
        res.status(200).json({ teilnehmer: users});
    } else {
        res.status(500).json({ message: err});
    }
  });
};

// test creation of new Reel
exports.apiNewReel = function(req, res){
    Reels.findOne({}, {}, {sort: {'nr' : -1}}, function(err, reel){
        if (!reel) { // define the Nr of the new Reel based on the nr of the last Reel in DB
            reelNr = 'R1000001';
        } else {
            reelNr = reel.nr.match(/\D+/)[0] + (parseInt(reel.nr.match(/\d+/))+1);
        } // define Reel nr
        // prepare new Reel data document
        var newReel = new Reels({
            nr: reelNr,
            reelStatus: 'erfasst',
            quantityCodes: req.body.quantityCodes,
            activatedCodes: 0,
            codes: req.body.codes.map(function(code){
                return {
                    rCode: code,
                    cStatus: 0,
                    }
                }),
            created: moment(new Date()).format('YYYY-MM-DDTHH:mm'),
            createdBy: req.user._id,
        }); // var newReel
        if (newReel.codes.length==newReel.quantityCodes){ // check whether quantity of codes is true
            newReel.save(function(err){
                if(!err){
                    res.status(201).json({message: "New Reel saved with nr: " + newReel.nr });
                } else {
                    res.status(500).json({message: "Could not create reel. " + err});
                }
            });
        } else {
            res.status(500).json({message: "You defined the quantity of " + newReel.quantityCodes + " codes but did only input " + newReel.codes.length + ". Please input the amount of codes that you defined in the field quantityCodes"});
        }
    }); // Reels.findOne 
}; // exports.apiNewReel

// test JSON endpoint with 
exports.apiShow = function(req, res) {
  var searchId = req.params.nr.substring(0,1)
  if (searchId == 'P'){
    console.log('Program ' + req.params.nr);
    Programs.findOne({nr: req.params.nr}, function(err, program){
        if(!err){
            res.status(200).json({ results: program});
        } else {
            res.status(500).json({ message: err});
        }
    });
  } else if (searchId == 'R'){
    console.log('Reel ' + req.params.nr);
    Reels.findOne({nr: req.params.nr}, function(err, reels){
        if(!err){
            res.status(200).json({ results: reels});
        } else {
            res.status(500).json({ message: err});
        }
    });
  } else if (searchId == 'K'){
    console.log('Customer ' + req.params.nr);
    Customers.findOne({nr: req.params.nr}, function(err, customers){
        if(!err){
            res.status(200).json({ results: customers});
        } else {
            res.status(500).json({ message: err});
        }
    });
  };
};

// Delete a user
exports.deleteUser = function(req, res) {
    console.log('wir löschen');
    CUsers.findOne({username: req.body.userName}, function(err, user) {
        if(!err && user) {
            var userId = user._id;
            Customers.findById(user.customer, function(err, customer){
                customer.user.forEach(function(CustUser){
                    if(JSON.stringify(CustUser)==JSON.stringify(userId)){
                        customer.user.pull(CustUser); // User vom Customer-Zuordnung rausnehmen
                    }
                });
            });
      user.remove(); // User löschen
      res.status(200).json({ message: "User removed."});
    } else if(!err) {
      res.status(404).json({ message: "Could not find User."});
    } else {
      res.status(403).json({message: "Could not delete User. " + err });
    }
  });
};