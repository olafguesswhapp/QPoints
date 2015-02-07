User = require('../models/user.js');

exports.CustomerOnly = function(req, res, next){
	if (!req.session.passport.user) return res.redirect(303, '/pleaselogin');
	User.findById(req.session.passport.user, function(err, user){
		if (err) return res.redirect(303, '/pleaselogin');
		if(user.role==='customer') return next();
		res.redirect(303, '/unauthorized');
	});
};

 exports.employeeOnly = function(req, res, next){
	var user = req.session.passport.user;
	if(user && req.role==='employee') return next();
	next('route');
}

exports.authent = function(req, res){
	console.log('aufruf von account ohne anhang');
	console.log(req.session.passport);
    if(!req.session.passport.user)
        return res.redirect(303, '/unauthorized');
    res.render('account');
};

exports.authentId = function(req, res, next){
	console.log('Anmeldung als User: ');
	console.log(req.params.id);
	User.findById(req.params.id, function(err, user){
		if(err) return next;
		var context = user;
		console.log(' context ist ' + context);
		// var context = {
		// 	user: user.map(function(USER){
		// 		return {
		// 			_id: USER._id,
		// 			name: USER.name,
		// 			authId: USER.authId,
		// 			role: USER.role,
		// 		}
		// 	})
		// };
		res.render('accountId', context );
	});
};