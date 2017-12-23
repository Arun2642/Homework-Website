//increases this number by 1 each time we add a student, used an a unique id for each student
studentIDNumber=0;
//buffer to add time of day (measured as minutes since beginning of 2017) to assignment start/stop times
dayTime=0;
dateParseSuccess=false;
//console log suppressions
suppressAddedCourse=true;
function printData(){
  var printBuffer="";

  printBuffer=printBuffer.concat("<h1>Summary Data</h1>");

  //course times per day
  var perDayTableBuffer=[];
  perDayTableBuffer.push(["Course Code","Students","Avg. Homework Time Per Day (Minutes)"]);
  for (y=0;courseList.length>y;y++){
    courseList[y].updateInfo();
    perDayTableBuffer.push( [courseList[y].courseCode, courseList[y].students.length,roundToPlace(courseList[y].dailyTime,0.001)]);
  }
  printBuffer=printBuffer.concat(makeTable(perDayTableBuffer,"normalizedTable","Homework Per Day, By Course",true));

  document.getElementById("summaryData").innerHTML=printBuffer;

}

monthStartTimes=[0,365,396,424,455,485,516,181,212,243,272,303,333];
minsInDay=1440;


reader.addEventListener('finishedParse', processHomeworkSheet,false)

//array which contains all student objects
studentList = [];

//array which contains all courses
var courseList=new Array();

//adds hardcoded class names to SOM and quest to avoid different naming schemes messing up data
courseList.push(new course("SOM"));
courseList.push(new course("QUEST"));

courseList.getCourse=function(name,suppressErrors){
  name=name.toUpperCase();

  if(name.includes("SOM")){
    return(this[0]);
  }
  else if(name.includes("QUEST")){
    return(this[1]);
  }

  for(l=0;l<this.length;l++){
    if(this[l].courseCode==name){
    //if(this[l].courseCode==name||name.includes(this[l].courseCode)){
      return this[l];
    }
  }
  if(!suppressErrors){console.log("Lookup for course ''"+name+"'' failed!");}
  return null;
}

function printCourseBreakdown(){
  var courseBreakdownTableBuffer=[];
  courseBreakdownTableBuffer.push(["Course Code","Students","Avg. Time Logged","Total Time Logged","Standard Deviation (% of Avg.)"])
  for(y=0;courseList.length>y;y++){
    courseList[y].updateInfo();
    courseBreakdownTableBuffer.push( [courseList[y].courseCode, courseList[y].students.length, courseList[y].avgTotalTime, courseList[y].totalTime, (100*(courseList[y].stdev/courseList[y].avgTotalTime)+"%") ]);
  }
  makeTable(courseBreakdownTableBuffer);
}
function printCourseTimeline(courseName,start,end){
  perDayBuffer=[];
  currentCourse=courseList.getCourse(courseName);
  for(b=0;b<currentCourse.assignments.length;b++){
    if(currentCourse.assignments[b].startTime>=start*1440&&currentCourse.assignments[b].startTime<end*1440){
      //TODO:finish this
    }
  }
}

function processHomeworkSheet(){
  printCSV();
  studentList =  studentList.concat(new student(CSVArray));
  //makeTable(studentList);
  printData();
  readSomeStuff();
}

function course(name){
  this.courseCode=name.toUpperCase();
  this.courseID=courseList.length;
  this.isLanguage=false;
  if(this.courseCode.includes("SPAN")){
    this.isLanguage=true;
    this.languageLevel=parseInt(this.courseCode[4]);
  } else if(this.courseCode.includes("CHIN")){
    this.isLanguage=true;
    this.languageLevel=parseInt(this.courseCode[4]);
  } else if(this.courseCode.includes("JPN")){
    this.isLanguage=true;
    this.languageLevel=parseInt(this.courseCode[3]);
  } else if(this.courseCode.includes("ASML")){
    this.isLanguage=true;
    this.languageLevel=parseInt(this.courseCode[4]);
  }
  this.students=[];
  this.avgTotalTime=0;
  this.totalTime=0;
  this.stdev=0;
  this.assignments=[];


  this.updateInfo=function(){
    this.avgTotalTime=0;
    var studentTimeBufferArray=[];
    this.dailyTime=0;
    for(r=0;r<this.students.length;r++){
      if(isNaN(this.students[r].courseTimeSpentList[this.students[r].courseList.indexOf(this)])){
        console.log("ERROR: "+this.courseCode+" total student ''"+this.students[r].courseTimeSpentList[this.students[r].courseList.indexOf(this)]+"'' is NaN.");
      }
      else{
// GOTO THIS BOI
        studentTimeBufferArray.push(this.students[r].courseTimeSpentList[this.students[r].courseList.indexOf(this)]);

        this.avgTotalTime=this.avgTotalTime+this.students[r].courseTimeSpentList[this.students[r].courseList.indexOf(this)];

        if(this.students[r].courseTimeSpentList[this.students[r].courseList.indexOf(this)]/this.students[r].daysLogged){
          this.dailyTime=this.dailyTime+(this.students[r].courseTimeSpentList[this.students[r].courseList.indexOf(this)]/this.students[r].daysLogged);
        }
        else{
          if(this.students[r].daysLogged<=0||!this.students[r].daysLogged){
            console.log("ERROR: Student "+r+" daysLogged = "+this.students[r].daysLogged+".");
          }
          if(!this.students[r].courseTimeSpentList[this.students[r].courseList.indexOf(this)]&&this.courseCode!="SOM"&&this.courseCode!="QUEST"){
            console.log("ERROR: Course ''"+this.courseCode+"'' cannot access student "+r+"'s logs for course.");
          }
        }
      }
    }
    if(isNaN(this.avgTotalTime)){
      console.log("ERROR: "+this.courseCode+" total time ''"+this.avgTotalTime+"'' is NaN.");
    }
    this.totalTime=this.avgTotalTime;
    this.avgTotalTime=this.avgTotalTime/this.students.length;

    if(this.students.length){
    this.dailyTime=this.dailyTime/this.students.length;
    }

    this.stdev=stdev(studentTimeBufferArray);
  }


  if(!suppressAddedCourse){
    console.log("Added new course ''"+this.courseCode+"''.");
  }
  return this;
};
//creates a student data object given a 2D array
function student(dataArray){
  //assigns student a new unique ID
  this.studentID=studentIDNumber;
  studentIDNumber=studentIDNumber+1;

  this.assignmentArray=[];
  dayTime=0;
  //console.log("reading course list");

  //this line deprecated, new line below supports "time wasted" and other irregular sheets
  //this.courseList=readCourseList(this,dataArray,[1,7]);

  this.courseList=readCourseList(this,dataArray,[1,dataArray[0].indexOf("Block:")+1]);

  this.courseTimeSpentList=[0,0,0,0,0,0,0,0,0];
  this.endDay=0;

  for(i=1;i<CSVArray.length;i++){
    //interprets dates
    if(CSVArray[i][1].includes("DAY")){
      console.log("Attempting to read date: " + CSVArray[i])
      dayTime=parseInt(interpretDate(CSVArray[i]));
      console.log("Parsed as: " + dayTime)
      if(!dayTime){
        console.log("ERROR: Returned non-usable date time''"+dayTime/1440+"''!!!");
        }

      if(i==1&&dayTime){
        if(this.startDay/1440>=240){
          //sanity check implemented solely so that Arun Johnson's logging of
          //quest work before the schoolyear did not mess up his averages.
            this.startDay=dayTime/1440;
        }
        else{
          this.startDay=240;
        }
      }

      if(this.endDay<=dayTime/1440){
        //console.log("changed end date to ''"+dayTime/1440+"''!!!");
        this.endDay=dayTime/1440;
      }
      else{
        //console.log(dayTime/1440+" did not pass test of being greater than or equal to "+this.endDay+".");
      }
    }

    //else if(CSVArray[i][0].length>2){
    //  this.assignmentArray.push(new assignment(this,courseList.getCourse(CSVArray[i][0]),CSVArray[i][1],CSVArray[i][2],CSVArray[i][3]))
    //}
    else if(CSVArray[i][0].length>2){
      //length check is to make blank cells will not reead as assignments if class code list is not filled out
      //console.log("reading assignment from "+CSVArray[i][0]);
      this.assignmentArray.push(new assignment(this,courseList.getCourse(CSVArray[i][0]),CSVArray[i][1],CSVArray[i][2],CSVArray[i][3],dayTime));
    }

  }
  for (q=0;q<this.courseList.length;q++){
    if(this.courseList[q]){
      this.courseList[q].updateInfo;
    }
  }
  if(!this.endDay||!this.startDay||this.endDay-this.startDay<0){
    console.log("ERROR: Student has starting day of "+this.startDay+" and ending day of "+this.endDay+", this will not allow for correct data.");
  }
  this.daysLogged=this.endDay-this.startDay;
  console.log("Created new student with "+this.assignmentArray.length+" assignments over "+this.daysLogged+" days of logged data.")
  return this;
}

function assignment(student,course,assignmentName,startTimeString,endTimeString,dayTime){
  this.course=course;
  this.assignmentName=assignmentName;

  this.startTime=interpretTime(startTimeString)+dayTime;
  this.endTime=interpretTime(endTimeString)+dayTime;
  //if assignment goes over AM-PM divide, makes sure we still have times that make sense
  if(this.startTime>this.endTime){
    this.endTime=this.endTime+720;
  }
  this.assignmentDuration=this.endTime-this.startTime;
  if(this.assignmentDuration>720){
    this.assignmentDuration=this.assignmentDuration-720;
  }

  //adds assignment duration to student time tally
  if(student.courseList.indexOf(this.course)!=-1&&!isNaN(this.assignmentDuration)){
    student.courseTimeSpentList[student.courseList.indexOf(this.course)]=student.courseTimeSpentList[student.courseList.indexOf(this.course)]+this.assignmentDuration;
    this.course.assignments.push(this);
  }
  return this;
}

function interpretTime(timeString){
  //parses string representation of time into minutes since start of day
  if (timeString.includes("PM")){
    if (timeString[1]==":") {
      //single digit hour
      return (720+(60*timeString[0])+parseInt(timeString[2]+timeString[3]));
    }
    else {
      return (720+(60*(timeString[0]+timeString[1]))+parseInt(timeString[3]+timeString[4]));
    }
  }
  else {
    if (timeString[1]==":") {
      //single digit hour
      return ((60*timeString[0])+parseInt(timeString[2]+timeString[3]));
    }
    else {
      return ((60*(timeString[0]+timeString[1]))+parseInt(timeString[3]+timeString[4]));
    }
  }
  console.log("Reading of time string ''"+timeString+"'' failed!");
  return null;
}

function readCourseList(student,dataArray,coordinates){
  courseArray=[];
  for(p=0;p<9;p++){
    if(dataArray[coordinates[0]+p][coordinates[1]].length>2){
      //if course does not already exist, create course
      if(courseList.getCourse(dataArray[coordinates[0]+p][coordinates[1]],true)==null&&dataArray[coordinates[0]+p][coordinates[1]].length>2){
        courseList.push(new course(dataArray[coordinates[0]+p][coordinates[1]]));
      }
      //adds student to course
      courseArray[p]=courseList.getCourse(dataArray[coordinates[0]+p][coordinates[1]]);
      if(student){
        courseList.getCourse(dataArray[coordinates[0]+p][coordinates[1]]).students.push(student);
      }
    }
  }
  return courseArray;
}

function validifyDate(date,inputArray){

}

function interpretDate(array){

    //gets the number of minutes since 2017 began that the date is on
    if(array[3][0]=="/"){
      if(array[3].length==3){
        return(1440*(parseInt(array[3][1]+array[3][2])+monthStartTimes[array[2]]));
      }
          else if(CSVArray[i][3].length==2){
            return(1440*(parseInt(array[3][1])+monthStartTimes[array[2]]));
          }
        }
        else if (array[3].length==2){
          return(1440*(parseInt(array[3][0]+array[3][1])+monthStartTimes[array[2]]));
        }
        else if(array[3].length==1){
          return(1440*(parseInt(array[3][0])+monthStartTimes[array[2]]));
        }

        else if(array[2].includes("/")){
          //edge case for audrey cho's janky formatting
          if(array[2][2]=="/"){
            if(array[2].length==4){
              return(1440*(monthStartTimes[array[2][0]+array[2][1]]+parseInt(array[2][3])));
            }
            else if(CSVArray[i][2].length==5){
              return(1440*(monthStartTimes[array[2][0]+array[2][1]]+parseInt(array[2][3]+array[2][4])));
            }
          }

          else if(CSVArray[i][2][1]=="/"){
            if(CSVArray[i][2].length==3){
              return(1440*(monthStartTimes[array[2][0]]+parseInt(array[2][2])));
            }
            else if(CSVArray[i][2].length==4){
              return(1440*(monthStartTimes[array[2][0]]+parseInt(array[2][2]+array[2][3])));
            }
          }

        }
          console.log("Failed to parse date '"+array[2]+"' '"+array[3]+"'.");
        return null;
}

function roundToPlace(num,place){
  return(Math.round(num/place)*place);
}
