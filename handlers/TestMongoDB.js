var TestDB = require('../models/testDB.js');

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