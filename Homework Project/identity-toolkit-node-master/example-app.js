/**
 * An Express web app using Google Identity Toolkit service to login users.
 */

var express = require('express');
var app = module.exports = express();

var cookieParser = require('cookie-parser');
app.use(cookieParser());

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

var fs = require('fs');
var url = require('url');

var GitkitClient = require('gitkitclient');
var gitkitClient = new GitkitClient(JSON.parse(fs.readFileSync('./gitkit-server-config.json')));

// allows one to access other files
app.use(express.static('Public'));
app.use('/public', express.static(__dirname + '/Public'));
app.use(express.static(__dirname + '/Public'));


// index page
app.get('/', renderIndexPage);

// returning to index page
app.get('/index.html', renderIndexPage);
app.get('/Home.html', renderHomePage);
app.get('/Test.html', renderTestPage);
app.get('/Play.html', renderPlayPage);
app.get('/moreInfo.html', renderFAQPage);


// widget page hosting Gitkit javascript
app.get('/gitkit', renderGitkitWidgetPage);
app.post('/gitkit', renderGitkitWidgetPage);

// Ajax endpoint to send email for password-recovery and email change event
app.post('/sendemail', renderSendEmailPage);

//Testing a post request
app.post('/receive', receive);

/*
The below codes uses mongoose to create a database, and define schemas with which to
input data into the database. 
*/
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/homework_database');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
 
var StudentSchema = new Schema({
    googleId:String,
    name:String,
    courses:Array,
    connectedSpreadsheet:Boolean,
    spreadsheetURL:String,
    ICSURL:String,
    startDate: { type: Date, default: Date.now }
});

var AssignmentSchema = new Schema({
    studentId: ObjectId,
    assignment: String,
    course: String,
    finished: { type: Boolean, default: false },
    title: String,
    description: String,
    times: [[Number]],
    url: String,
    group: String,
    dtstart: String,
    dtend: String,
    dtstamp: String
});
AssignmentSchema.index({studentId: 1, assignment: 1}, {unique: true});
AssignmentSchema.virtual("timeSpent").get(function() {
    timeSpent = 0;
    for (var time of this.times) {
        timeSpent += time[1]-time[0];
    }
    return timeSpent;
});

var Student = mongoose.model('Student', StudentSchema);
var Assignment = mongoose.model('Assignment', AssignmentSchema);

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

// middleware to use for all requests
router.use(function (req, res, next) {
    // do logging
    console.log('Something is happening.');
    next(); // make sure we go to the next routes and don't stop here
});

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function (req, res) {
    res.json({message: 'hooray! welcome to our api!'});
});

// more routes for our API will happen here

// on routes that end in /students
// ----------------------------------------------------
router.route('/students')

         // create a student (accessed at POST http://localhost:8080/api/students)
        .post(function (req, res) {

            var student = new Student();     // create a new instance of the Student model
            student.name = req.body.name;    // set the students name (comes from the request)
            student.email = req.body.email;

            // save the student and check for errors
            student.save(function (err) {
                if (err)
                    res.send(err);

                res.json({message: 'Student created!', studentId: student._id});
            });

        })

        // get all the students (accessed at GET http://localhost:8080/api/students)
        .get(function (req, res) {
            Student.find(function (err, students) {
                if (err)
                    res.send(err);

                res.json(students);
            });
        });

router.route('/students/:student_id')

        // get the student with that id (accessed at GET http://localhost:8080/api/students/:student_id)
        .get(function (req, res) {
            Student.findById(req.params.student_id, function (err, student) {
                if (err)
                    res.send(err);
                res.json(student);
            });
        })

        // update the student with this id (accessed at PUT http://localhost:8080/api/students/:student_id)
        .put(function (req, res) {

            // use our student model to find the student we want
            Student.findById(req.params.student_id, function (err, student) {

                if (err)
                    res.send(err);

                console.log("courses="+JSON.stringify(req.body));
                console.log("courses="+JSON.stringify(req.body["courses[]"]));
                if (req.body.spreadsheetURL)
                    student.name = req.body.spreadsheetURL; 
                if (req.body["courses[]"])
                    student.courses = req.body["courses[]"]; 
                if (req.body.ICSURL) {
                    student.ICSURL = req.body.ICSURL;
                    readCoursesFromURL(student,student.ICSURL);
                }

                // save the student
                student.save(function (err) {
                    if (err)
                        res.send(err);

                    res.json({message: 'Student updated!', 'student': student});
                });

            });
        })

        // delete the student with this id (accessed at DELETE http://localhost:8080/api/students/:student_id)
        .delete(function (req, res) {
            Student.remove({
                _id: req.params.student_id
            }, function (err, student) {
                if (err)
                    res.send(err);

                res.json({message: 'Successfully deleted'});
            });
        });

router.route('/students/:student_id/assignments')

        .get(function (req, res) {
            Assignment.find({studentId:req.params.student_id},function (err, assignments) {
                if (err)
                    res.send(err);

                res.json(assignments);
            });
        });

// on routes that end in /assignments
// ----------------------------------------------------
router.route('/assignments')

         // create a assignment (accessed at POST http://localhost:8080/api/assignments)
        .post(function (req, res) {

            var assignment = new Assignment(); 
            assignment.studentId = req.body.studentId; 
            assignment.course = req.body.course;
            assignment.assignment = new mongoose.Types.ObjectId().toString();
            assignment.title = req.body.title;
            assignment.description = req.body.description;
            assignment.finished = false;

            // save the assignment and check for errors
            assignment.save(function (err) {
                if (err) {
                   console.log(err);
                   res.send(err);
                } else { 
                   res.json({'message': 'Assignment created!', assignment: assignment});
                }
            });

        })

        // get all the assignments (accessed at GET http://localhost:8080/api/assignments)
        .get(function (req, res) {
            Assignment.find(function (err, assignments) {
                if (err)
                    res.send(err);

                res.json(assignments);
            });
        });
        
router.route('/assignments/:assignment_id/times')
         // Add times
        .post(function (req, res) {

            Assignment.findById(req.params.assignment_id, function (err, assignment) {
                if (err){
                    res.send(err);
                    console.log(err);
                }
                else{
                    //if (assignment.times === null) { assignment.times = []; }
                    assignment.times.push([req.body.start,req.body.stop]);
                    if (req.body.finished !== null) {
                        assignment.finished = req.body.finished;
                    }
                    // save the assignment and check for errors
                    console.log("Trying to save assignment: " + JSON.stringify(assignment));
                    assignment.save(function (err) {
                        if (err){
                            res.send(err);
                            console.log(err);
                        }
                        else{
                            res.json({message: 'Assignment created!', assignmentId: assignment._id});
                        }
                    }); 
                }
            });
        }); 
        
router.route('/assignments/:assignment_id')

        // get the assignment with that id (accessed at GET http://localhost:8080/api/assignments/:assignment_id)
        .get(function (req, res) {
            Assignment.findById(req.params.assignment_id, function (err, assignment) {
                if (err){
                    res.send(err);
                    console.log(err);
                }
                else{
                    res.json(assignment);
                }
            });
        })

        // update the assignment with this id (accessed at PUT http://localhost:8080/api/assignment/:assignment_id)
        .put(function (req, res) {

            // use our assignment model to find the assignment we want
            Assignment.findById(req.params.assignment_id, function (err, assignment) {

                if (err){
                    console.log("Could not find assignment because: " + err);
                    res.send(err);
                }
                else{
                    console.log("found " + assignment)
                    if (req.body.finished !== null) {
                       console.log("The assignment is: " + assignment)
                       assignment.finished = req.body.finished;
                    }
 
                    // save the assignment
                    assignment.save(function (err) {
                     if (err){
                        console.log("Could not save because: " + err)
                        res.send(err);
                     }
                     else{
                        res.json({message: 'Assignment updated!'});
                     }
                    });
                }

            });
        })

        // delete the assignment with this id (accessed at DELETE http://localhost:8080/api/assignment/:assignment_id)
        .delete(function (req, res) {
            Assignment.remove({
                _id: req.params.assignment_id
            }, function (err, assignment) {
                if (err)
                    res.send(err);

                res.json({message: 'Successfully deleted'});
            });
        });
        
 
// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);


function renderGitkitWidgetPage(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    var html = new Buffer(fs.readFileSync('./gitkit-widget.html')).toString();
    html = html.replace('%%postBody%%', encodeURIComponent(req.body || ''));
    res.end(html);
}

//TODO: Stop using this, use the API above
function receive(req, res) {
    if (req.cookies.gtoken) {
        gitkitClient.verifyGitkitToken(req.cookies.gtoken, function (err, resp) {
            if (err) {
                printLoginInfo(res, 'Invalid token: ' + err);
            } else {
                console.log('Updating student database with new URL. Looking for student with id of: ' + req.body.id + ' and planning to add the url ' + req.body.url);
                Student.findOne({_id:req.body.id}, function(err,student){
                        if (err){
                            console.log("Unable to add URL to student database because: " + err);
                        }
                        student.spreadsheetURL = req.body.url;
                        console.log("adding url: " + req.body.url);
                        student.save(function(err){if(err){console.log("Unable to save url added to student databse because: " + err);}});
                    }
                );
            }
        });
    } else {
        printLoginInfo(res, 'You are not logged in yet.');
    }
}

function renderIndexPage(req, res) {
    if (req.cookies.gtoken) {
        gitkitClient.verifyGitkitToken(req.cookies.gtoken, function (err, resp) {
            if (err) {
                printLoginInfo(res, 'Invalid token: ' + err);
            } else {
                printLoginInfo(res, 'Welcome back! Login token is: ' + JSON.stringify(resp));
            }
        });
    } else {
        printLoginInfo(res, 'You are not logged in yet.');
    }
}

function renderHomePage(req, res) {
    renderHome(req,res,"./Home.html");
}

function renderFAQPage(req, res){
    renderHome(req,res,"./moreInfo.html")
}

function renderTestPage(req, res) {
    renderHome(req,res,"./Test.html");
}

function renderHome(req,res,page) {
    var specificStudent;
    if (req.cookies.gtoken) {
        console.log("First statement true");
        gitkitClient.verifyGitkitToken(req.cookies.gtoken, function (err, resp) {
            if (err) {
                console.log("An error occurred" + err);
                printLoginInfo(res, 'Invalid token: ' + err);
            } else {
                Student.findOne({"googleId" : resp.email}, function(err,student){
                    if (err) {
                        console.log("A database error occured");
                    }
                
                    if (student) {    
                        console.log("Welcome back! "+JSON.stringify(resp));
                        console.log("Welcome back!");
                        console.log("Welcome back!");
                        console.log("Welcome back!");
                        specificStudent = student;
                    }
                    else{
                        var newStudent = new Student(
                                {googleId:resp.email,
                                 name:resp.display_name,
                                 courses:[],
                                 connectedSpredsheet:false, 
                                 spreadsheetURL : "", 
                                 ICSURL : ""});
                        newStudent.save(function(err){
                            if(err){
                                console.log("Could not save to database because: " + err);
                            }
                            else{
                                console.log("New student saved to database");
                            }
                        });
                        specificStudent = newStudent;
                        console.log("Welcome! Created new student collection");
                        console.log("Welcome! Created new student collection");
                        console.log("Welcome! Created new student collection");
                        console.log("Welcome! Created new student collection");
                    }
                    // If the ICSURL is set then update the assignments
                    if (specificStudent.ICSURL) {
                       var promise = readCoursesFromURL(specificStudent._id,specificStudent.ICSURL);
                    } else {
                        promise = Promise.resolve();
                    }
                    
                    promise.then(
                        Assignment.find({"studentId": specificStudent._id},function(err,studentAssignments) {
                            if (err) {
                                console.log("A database error occured");
                            }
                            res.writeHead(200, {'Content-Type': 'text/html'});
                            var html = new Buffer(fs.readFileSync(page)).toString();
                            var html = replaceAll(html,'%%student%%', JSON.stringify(specificStudent));
                            var html = replaceAll(html,'%%assignments%%', JSON.stringify(studentAssignments));
                            res.end(html);
                        }));
                });
            }
        });
    } else {
        console.log("First statement returned false");
        var html = new Buffer(fs.readFileSync(page))
                .toString();
        res.end(html);
    }
}
    
function renderPlayPage(req, res) {
    if (req.cookies.gtoken) {
        gitkitClient.verifyGitkitToken(req.cookies.gtoken, function (err, resp) {
            if (err) {
                printLoginInfo(res, 'Invalid token: ' + err);
            } else {
                printLoginInfo(res, 'Welcome back! Login token is: ' + JSON.stringify(resp));
            }
        });
    } else {
        printLoginInfo(res, 'You are not logged in yet.');
    }
}


function renderSendEmailPage(req, res) {
    app.disable('etag');
    gitkitClient.getOobResult(req.body, req.ip, req.cookies.gtoken, function (err, resp) {
        if (err) {
            console.log('Error: ' + JSON.stringify(err));
        } else {
            // Add code here to send email
            console.log('Send email: ' + JSON.stringify(resp));
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        res.end(resp.responseBody);
    });
}

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
                            Assignment.update({"studentId": studentId, "assignment": dict["UID"]}, {
                                "studentId": studentId,
                                "assignment": dict["UID"],
                                "course": m[2],
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

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}

function printLoginInfo(res, loginInfo) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    var html = new Buffer(fs.readFileSync('./index.html'))
            .toString()
            .replace('%%loginInfo%%', loginInfo);
    res.end(html);
}

var port = 8000;
app.listen(port);
console.log('Server running at http://aruninc.com:%d/', port);

