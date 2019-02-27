var verboseOutput = true;

function getSearchQuery() {
  // URL to request results from
  var requestURL = "https://cors.io/?https://e621.net/post/index.json?limit=10"; // TODO: replace this with own service

  // create request
  verboseLog("creating request");
  var request = new XMLHttpRequest();
  request.open("GET", requestURL);
  request.responseType = "json";
  request.send();

  // once request loads
  request.onload = function() {
    verboseLog("Request has loaded");
    var results = request.response;
    appendResultsToPage("results", results); // Add results to page
  };
}

// add all results to page
function appendResultsToPage(divId, resultsArray) {
  // padding and functionality variables

  var div = document.getElementById(divId); // div on page to append results
  div.innerHTML = "Results:<br />"; // clean up any existing results TODO: make this its own function
  resultsArray.forEach(function(result, resultIndex) {
    const fileUrl = result["file_url"];
    const fileName = result["artist"] + " - " + result["md5"];

    verboseLog("Appending image:\n" + fileUrl + "\n" + fileName);

    div.innerHTML +=
      resultIndex +
      ': <a href="' +
      fileUrl +
      '"><img src="' +
      result["file_url"] +
      '" alt="' +
      result["tags"] +
      '"></a><br />';
  });
}

/*
// GENERAL HELPER FUNCTIONS
*/

// Print to console only if verbose output is enabled
function verboseLog(text) {
  if (verboseOutput) console.log(text);
}
