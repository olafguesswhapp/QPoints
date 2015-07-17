switch(app.get('env')){
    case 'development':
        var baseUrl = ''; //'http://qpoints.schedar.uberspace.de/';
        break;
    case 'production':
        var baseUrl = 'http://qpoints.schedar.uberspace.de/';
        break;
    default:
        throw new Error('Unknown execution environment: ' + app.get('env'));
}

exports.map = function(name){
	return baseUrl + name;
};