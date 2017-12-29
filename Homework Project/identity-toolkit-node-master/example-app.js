/**
 * Copyright 2014 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * An Express web app using Google Identity Toolkit service to login users.
 */

var express = require('express'), app = module.exports = express();
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
app.use(express.static('public'));

app.use('/public', express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/public'));


// index page
app.get('/', renderIndexPage);

// returning to index page
app.get('/index.html', renderIndexPage);
app.get('/Home.html', renderHomePage);
app.get('/Play.html', renderPlayPage);


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

var Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;
 
var StudentSchema = new Schema({
    userId:ObjectId,
    googleId:String,
    courses:Array,
    connectedSpreadsheet:Boolean,
    spreadsheetURL:String,
    ICSURL:String,
    assignments:Array
});

var Student = mongoose.model('Student', StudentSchema);
//var Arun = new Student({courses:["SPAN401", "CHEM230"], connectedSpreadsheet: false, spreadsheetUrl : "", assignments: []})
//console.log(Arun.courses[0])

Arun.save(function (err, Arun) {
    if (err) return console.error(err);
  });

function renderGitkitWidgetPage(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    var html = new Buffer(fs.readFileSync('./gitkit-widget.html')).toString();
    html = html.replace('%%postBody%%', encodeURIComponent(req.body || ''));
    res.end(html);
}


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
                        console.log("adding url: " + req.body.url)
                        student.save(function(err){if(err){console.log("Unable to save url added to student databse because: " + err)}});
                    }
                )
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
    var specificStudent;
    if (req.cookies.gtoken) {
        console.log("First statement true")
        gitkitClient.verifyGitkitToken(req.cookies.gtoken, function (err, resp) {
            if (err) {
                console.log("An error occurred" + err)
                printLoginInfo(res, 'Invalid token: ' + err);
            } else {
                Student.findOne({"googleId" : resp.email}, function(err,student){
                    if (err) {
                        console.log("A database error occured");
                    }
                
                    if (student) {    
                        console.log("Welcome back!")
                        console.log("Welcome back!")
                        console.log("Welcome back!")
                        console.log("Welcome back!")
                        url = student.spreadsheetURL
                        specificStudent = student
                    }
                    else{
                        var newStudent = new Student({googleId:resp.email,courses:[],connectedSpredsheet:false, spreadsheetUrl : "", ICSURL : "", assignments: []})
                        newStudent.save(function(err){
                            if(err){
                                console.log("Could not save to database because: " + err)
                            }
                            else{
                                console.log("New student saved to database")
                            }
                        });
                        specificStudent = newStudent
                        url = student.spreadsheetURL;
                        console.log("Welcome! Created new student collection")
                        console.log("Welcome! Created new student collection")
                        console.log("Welcome! Created new student collection")
                        console.log("Welcome! Created new student collection")
                    }
                    
                   res.writeHead(200, {'Content-Type': 'text/html'});
                   var html = new Buffer(fs.readFileSync('./Home.html'))
                        .toString()
                   var html = replaceAll(html,'%%student%%', JSON.stringify(student));
                   res.end(html);
                });
            }
        });
    } else {
        console.log("First statement returned false")
        var html = new Buffer(fs.readFileSync('./Home.html'))
                .toString()
        res.end(html);
    }
    
    /* var html = new Buffer(fs.readFileSync('./Home.html'))
    .toString()
    res.end(html);
    console.log('PRINTING A STATEMENT'); */
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
    })
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
app.listen(8080);
console.log('Server running at http://127.0.0.1:%d/', port);

