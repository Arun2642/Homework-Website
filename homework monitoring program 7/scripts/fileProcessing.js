var parseEvent = new Event('finishedParse');
var finishedWithSheetEvent = new Event('finishedWithSheet');
var processStartTime = 0;
var processEndTime = 0;

var reader = new FileReader();
var CSVText = ""
var CSVArray = [];
var fileArray = [];
var bufferNumber = 0;
reader.addEventListener('loadend', init, false);

//General loading/saving functions
//Initializes the file loader and sets it up to print debug info upon running
function handleFileSelect(evt) {
  processStartTime = new Date();
  var files = evt.target.files; // FileList object
  // files is a FileList of File objects. List some properties.
  var output = [];
  for (var i = 0, f; f = files[i]; i++) {
    //console.log(f);
    theCSV = f;
    output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',
              f.size, ' bytes, last modified: ',
              f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',
              '</li>');

              //reader.readAsText(theCSV);
              fileArray.push(f);
  }
  document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
  //reader.readAsText(theCSV);
  //console.log(fileArray);
  readSomeStuff();
}

function readSomeStuff(){
  if(fileArray[bufferNumber]&&(bufferNumber!=fileArray.length-1||(fileArray.length==1&&bufferNumber==0))){
    //console.log("Reading student file #"+bufferNumber+".")
    //console.log(fileArray[bufferNumber]);
    reader.readAsText(fileArray[bufferNumber]);
    bufferNumber++;
  }
  else{
    processEndTime= new Date();
    console.log("Process took "+((processEndTime.getTime()-processStartTime.getTime())/1000)+" seconds.")
  }
}


  document.getElementById('files').addEventListener('change', handleFileSelect, false);

//CSV specific functions
  //parses the CSV into the array buffer once it has finished loading
function init(){
  //console.log("Starting to parse CSV to array...");
  //console.log("File is " +reader.result.length+" bytes long.");
  //CSVArray = clean(parseCSV(reader.result));
  CSVArray = parseCSV(reader.result);
  reader.dispatchEvent(parseEvent);
  //console.log("Finished.");
}
  //prints the csv data as a table
function printCSV(){
  makeTable(CSVArray);
}
  //converts all rows below the first to numerical data - disabled for now
  //conversion in the arrays? idk dont touch it
  function clean(inputArray){
  for(var cleaningRow=1; cleaningRow<inputArray.length; cleaningRow++){
    for (var cleaningColumn in inputArray[cleaningRow]){
      inputArray[cleaningRow][cleaningColumn]=inputArray[cleaningRow][cleaningColumn]-0;
    }
  }
  return inputArray;
}
  //converts CSV string to a 2D array object - def stole this from stackoverflow
  function parseCSV(str) {
    console.log("the csv string is: " + str)
    var arr = [];
    var quote = false;  // true means we're inside a quoted field

    // iterate over each character, keep track of current row and column (of the returned array)
    for (var row = col = c = 0; c < str.length; c++) {
        var cc = str[c], nc = str[c+1];        // current character, next character
        arr[row] = arr[row] || [];             // create a new row if necessary
        arr[row][col] = arr[row][col] || '';   // create a new column (start with empty string) if necessary

        // If the current character is a quotation mark, and we're inside a
        // quoted field, and the next character is also a quotation mark,
        // add a quotation mark to the current column and skip the next character
        if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }

        // If it's just one quotation mark, begin/end quoted field
        if (cc == '"') { quote = !quote; continue; }

        // If it's a comma and we're not in a quoted field, move on to the next column
        if (cc == ',' && !quote) { ++col; continue; }

        // If it's a newline and we're not in a quoted field, move on to the next
        // row and move to column 0 of that new row
        if (cc == '\n' && !quote) { ++row; col = 0; continue; }

        // Otherwise, append the current character to the current column
        arr[row][col] += cc;
    }
    return arr;
}
  //given a 2D array, prints a table of its values
function makeTable(myArray,tableID,title,noprint) {
    //console.log("Starting to print array data as table...");
    var result = "<table border=1>";
    for(var i=0; i<myArray.length; i++) {
        result += "<tr>";
        for(var j=0; j<myArray[i].length; j++){
            result += "<td>"+myArray[i][j]+"</td>";
        }
        result += "</tr>";
    }
    result += "</table>";

    if(title){
      result="<h2>"+title+"</h2>"+result
    }
    if(!tableID){
      tableID="table";
    }
    if(noprint){
      return result;
    }
    document.getElementById(tableID).innerHTML=result;
          //console.log("Finished.");
    return;
}

//old math functions, shouldn't need these

function pValue(inputArray,coefic){
  pVal=normal(coefic/(stdev(inputArray)/Math.sqrt(inputArray.length)));
  if(pVal>0.0000001){
    return pVal;
  }
  else{
    return 0;
  }
  //console.log(coefic);
  //console.log(inputArray);
}

function stdev(inputarray){
   if(inputarray.length==0){return 0;}
   var i,j,total = 0, mean = 0, diffSqredArr = [];
   for(i=0;i<inputarray.length;i+=1){
       total+=inputarray[i];
   }
   mean = total/inputarray.length;
   for(j=0;j<inputarray.length;j+=1){
       diffSqredArr.push(Math.pow((inputarray[j]-mean),2));
   }
   return (Math.sqrt(diffSqredArr.reduce(function(firstEl, nextEl){
     return firstEl + nextEl;
          })/inputarray.length));
}
//approximation of normal distribution
//https://home.ubalt.edu/ntsbarsh/Business-stat/otherapplets/pvalues.htm
function normal(z) {
		z=Math.abs(z)
		var p=1+ z*(0.04986735+ z*(0.02114101+ z*(0.00327763+ z*(0.0000380036+ z*(0.0000488906+ z*0.000005383)))))
		p=p*p; p=p*p; p=p*p
		return 1/(p*p)
}
