var nodemailer = require('nodemailer');

module.exports = function (credentials) {
	// create reusable transporter object using SMTP transport
	var transporter = nodemailer.createTransport({
		service: '1und1',
		auth: {
			user: credentials.email.user,
			pass: credentials.email.password
		}
	});

	// setup e-mail data with unicode symbols
	var mailOptions = {
		from: 'Olafo <olaf@guesswhapp.de>', // sender address
		to: 'olaf@guesswhapp.de', // list of receivers
	    subject: 'Action - Test', // Subject line
	    text: 'This is the nodemailer 1.0 Test', // plaintext body
	    // html: '<b>Hello world ✔</b>' // html body
	};
	
	// send mail with defined transport object
	return transporter.sendMail(mailOptions, function(error, info){
    if(error){
        console.log(error);
    }else{
        console.log('Message sent: ' + info.response);
    }
});
};