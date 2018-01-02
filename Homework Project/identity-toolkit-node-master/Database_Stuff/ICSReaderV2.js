var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/homework_database').then(
    () => {
       console.log("ready");
       courseAdder("tonyj321@gmail.com").then(
       () => {
           mongoose.disconnect();
       },
       err => {
        throw err;
       });
     }),
     err => {
        throw err;
     };

/* var fs = require('fs'),
 readline = require('readline');
 rd = readline.createInterface({
 input: fs.createReadStream('./TheFile.ics'),
 console: false
 });
 
 var summaryFind = /SUMMARY:(.+)/g
 
 rd.on('line', function(line) {
 matchArray = line.match(summaryFind);
 console.log(matchArray);
 });
 
 var matchArray = [];
 var fs = require('fs');
 var ICS = new Buffer(fs.readFileSync('./TheFile.ics')).toString();
 ICS = ICS.replace(/(\r\n|\n|\r) /gm,"");
 ICS = ICS.replace(/\\/g,"");
 var summaryFind = /SUMMARY:([^\[]+)\[([A-Z]+[0-9]+) ([^\]]+)\]/g;
 var ICX = "SUMMARY: BLah, Blarg, blap [ARU200 Arun 2000]"
 //matchArray = ICS.match(summaryFind);
 var match = summaryFind.exec(ICS);
 while (match != null){
 matchArray.push([match[1],match[2]]);
 match = summaryFind.exec(ICS);
 
 }
 
 
 console.log("Done, here is the output")
 console.log(matchArray);
 /* for (var i=0; i<matchArray.length; i++){
 console.log(matchArray[i])
 } */

//var mongoose = require('mongoose');/
//mongoose.connect('mongodb://localhost/homework_database');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var StudentSchema = new Schema({
    userId: ObjectId,
    googleId: String,
    courses: Array,
    connectedSpreadsheet: Boolean,
    spreadsheetURL: String
});

var AssignmentSchema = new Schema({
    _id: String,
    studentId: ObjectId,
    course: String,
    finished: Boolean,
    title: String,
    description: String,
    times: Array,
    url: String,
    group: String,
    dtstart: String,
    dtend: String,
    dtstamp: String
});

var Student = mongoose.model('Student', StudentSchema);
var Assignment = mongoose.model('Assignment', AssignmentSchema);
//var Arun = new Student({courses:["SPAN401", "CHEM230"], connectedSpreadsheet: false, spreadsheetUrl : "", assignments: []})
//console.log(Arun.courses[0])
/* Arun.save(function (err, Arun) {
 if (err) return console.error(err);
 }); */
var request = require('request');

function readCoursesFromURL(studentId, url) {
    var promise = new Promise(function (resolve, reject)
    {
        request(url, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                var discoveredCourses = [];
                body = body.replace(/(\r\n|\n|\r) /gm, "");
                //body = body.replace(/\\/g,"");
                var lines = body.split(/\r\n|\n|\r/gm);
                var dict = {};
                for (var line of lines) {
                    if (line === 'BEGIN:VEVENT') {
                        dict = {};
                    } else if (line === 'END:VEVENT') {
                        //Ready to add entry to assignments
                        var summary = dict['SUMMARY'];
                        var m = /([^\[]+)\[([A-Z]+ ?[0-9]+) ?([^\]]*)\]/g.exec(summary);
                        if (m) {
                            discoveredCourses.push(m[2]);
                            Assignment.update({"_id": dict["UID"]}, {
                                "_id": dict["UID"],
                                "studentId": studentId,
                                "course": m[2],
                                "finished": false,
                                "title": m[1],
                                "group": m[3],
                                "description": dict['DESCRIPTION'],
                                "url": dict["URL"],
                                "dtstart": dict["DTSTART"],
                                "dtend": dict["DTEND"],
                                "dtstamp": dict["DTSTAMP"]}, {upsert: true}, function (err) {
                                if (err) {
                                    reject(err);
                                } else {
                                    console.log("New assignment saved to database");
                                }
                            });
                        }
                    } else {
                        var m = /([A-Z]+)(?:;VALUE=[A-Z]+)?:(.*)/g.exec(line);
                        if (m) {
                            dict[m[1]] = m[2];
                        }
                    }
                }
                Student.update(
                        {_id: studentId},
                        {$addToSet: {courses: {$each: discoveredCourses}}}, function (err, res) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve("Success");
                    }
                }
                );
            } else {
                reject(error);
            }
        });
    });
    return promise;
}

function courseAdder(email) {
    var promise = new Promise(function(resolve,reject)
    {
        console.log("looking for student:" + email);
        Student.findOne({googleId: email}).then
        (
           (student) => {
               if (student === null) {
                  reject(new Error("ERROR! This student doesn't exist..." + email));
               } else {
                  readCoursesFromURL(student._id, "https://nuevaschool.instructure.com/feeds/calendars/user_k04iamDbwp7wVajUopCZFjocNX3l4o9Xj2WwdCY3.ics").then(
                    ()=>{resolve("success");},
                    err=>{reject(err);});
               }
           },
           (err) => {
               reject(err);
           }    
        );
    });
    return promise;
}


function addAssignment(studentId, course, finished, title, description, times) {
    var newAssignment = new Assignment({
        "studentId": studentId,
        "course": course,
        "finished": finished,
        "title": title,
        "description": description,
        "times": times
    });
    newAssignment.save(function (err) {
        if (err) {
            console.log("Could not save assignment to database because: " + err);
        } else {
            console.log("New assignment saved to database");
        }
    });
}
;

/*
 console.log("Adding assignment");
 Student.findOne({"googleId" : email}, function(err,student){
 if (err) {
 console.log("A database error occured (When trying to search for student with e-mail: " + email);
 }
 if (!student){
 console.log("ERROR! This student doesn't exist...")
 }
 else{
 //addAssignment(student._id, "ENG301", false, "Gatsby Essay", "Write it", []);
 console.log("Added assignment, now updating")
 updateAssignment(student._id, "ENG301", "Gatsby Essay", true, [1123489,8904003]);        
 }
 });
 
 function updateAssignment(studentId, course, title, finished, times){
 Assignment.update(
 {"studentId":studentId, "course":course, "title":title},
 {"finished" : finished, $addToSet: {"times":times}},
 function(err,res){if(err){console.log(err)}else{console.log(res)}}
 );
 }
 */

/* Student.findOne({"googleId" : email}, function(err,student){
 if (err) {
 console.log("A database error occured (When trying to search for student with e-mail: " + email);
 }
 if (!student){
 console.log("ERROR! This student doesn't exist...")
 }
 else{
 Student.update(
 {_id:student._id},
 { $addToSet: { assignments:[
 {'title':title, 'course':course, 'description':description, 
 'finished':finished}]}},
 function(err,res){
 if(err){
 console.log("Yup, this doesn't work because: " + err);
 }
 else{
 console.log(res);
 }
 }
 );
 }
 }); */





//addAssignment("test","test","test",false);