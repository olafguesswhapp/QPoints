var mongoose = require('mongoose');

var testDBSchema = new mongoose.Schema({
	a: String,
	b: String,
});
// testDBSchema.methods.get2ndVar = function(){
// 	return this.b;
// };
var TestDB = mongoose.model('TestDB', testDBSchema,'testdbs');
module.exports = TestDB;