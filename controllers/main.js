var VALID_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

module.exports = {
    registerRoutes: function(app) {
        app.get('/', this.home);
        app.get('/newsletter', this.newsletter);
        app.post('/newsletter', this.newsletterProcessPost);
        app.get('/newsletter/archive', this.newsletterArchive);
    },

    home: function(req, res) {
        console.log(res.locals);
        res.render('home');
    },

    newsletter: function(req, res){
        // we will learn about CSRF later...for now, we just
        // provide a dummy value
        res.render('newsletter');
    },

    newsletterProcessPost: function(req, res){
        var name = req.body.name || '', email = req.body.email || '';
        // input validation
        if(!email.match(VALID_EMAIL_REGEX)) {
            if(req.xhr) return res.json({ error: 'Invalid name email address.' });
            req.session.flash = {
                type: 'danger',
                intro: 'Validation error!',
                message: 'The email address you entered was  not valid.',
            };
            return res.redirect(303, '/newsletter/archive');
        }
        new NewsletterSignup({ name: name, email: email }).save(function(err){
            if(err) {
                if(req.xhr) return res.json({ error: 'Database error.' });
                req.session.flash = {
                    type: 'danger',
                    intro: 'Database error!',
                    message: 'There was a database error; please try again later.',
                };
                return res.redirect(303, '/newsletter/archive');
            }
            if(req.xhr) return res.json({ success: true });
            req.session.flash = {
                type: 'success',
                intro: 'Thank you!',
                message: 'You have now been signed up for the newsletter.',
            };
            return res.redirect(303, '/newsletter/archive');
        });
    },

    newsletterArchive: function(req, res){
        res.render('newsletter/archive');
    },

    genericThankYou: function(req, res){
        res.render('thank-you');
    },

};

// for now, we're mocking NewsletterSignup:
function NewsletterSignup(){
}
NewsletterSignup.prototype.save = function(cb){
    cb();
};
