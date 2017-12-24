

/*
The below codes uses mongoose to create a database, and define schemas with which to
input data into the database. 
*/
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/homework_database');

var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;
 
var StudentSchema = new Schema({
    userId:ObjectId,
    googleId:String,
    courses:Array,
    connectedSpreadsheet:Boolean,
    spreadsheetURL:String,
    assignments:Array
});

var Student = mongoose.model('Student', StudentSchema);
var Arun = new Student({courses:["SPAN401", "CHEM230"], connectedSpreadsheet: false, spreadsheetUrl : "", assignments: []})
console.log(Arun.courses[0])

Arun.save(function (err, Arun) {
    if (err) return console.error(err);
  });