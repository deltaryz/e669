var verboseOutput = true;
var currentPage = 1;

function getSearchQuery() {
  // obtain tag query
  var tags = document.getElementById("tags").value;

  // make array of tags
  var splitTags = tags.split(" ");
  verboseLog(
    "User searched with tags:\n" +
      splitTags +
      "\nArray length: " +
      splitTags.length
  );

  // check if there are more than 6 tags
  if (splitTags.length > 6) {
    // let user know this is too many tags
    var div = document.getElementById("results");
    div.innerHTML =
      "<b>Your fetishes are getting really specific.</b><br/>7+ tag searches are still a work in progress. For now, keep your searches at 6 tags or less!";
  } else {
    // URL to request results from
    var requestURL =
      "https://cors-anywhere.herokuapp.com/https://e621.net/post/index.json?limit=10&page=" +
      currentPage +
      "&tags=" +
      tags; // TODO: replace this with own service

    // create request
    verboseLog("creating request to " + requestURL);
    var request = new XMLHttpRequest();
    request.open("GET", requestURL);
    request.responseType = "json";
    request.send();

    // once request loads
    request.onload = function() {
      verboseLog("Request has loaded");
      var results = request.response;

      var div = document.getElementById("results"); // div on page to append results
      div.innerText = "<b>Loading, please wait...</b>";

      appendResultsToPage(div, results); // Add results to page
    };
  }

  // add all results to page
  function appendResultsToPage(div, resultsArray) {
    // padding and functionality variables

    div.innerHTML = "Results:<br />"; // clean up any existing results TODO: make this its own function
    resultsArray.forEach(function(result, resultIndex) {
      const fileUrl = result["file_url"];
      const fileName = result["artist"] + " - " + result["md5"];
      const fileType = result["file_ext"];

      verboseLog("Appending image:\n" + fileUrl + "\n" + fileName);

      // check if file is an SWF or WEBM
      if (fileType === "webm") {
        div.innerHTML +=
          '<a href="' +
          fileUrl +
          '"><video src="' +
          result["file_url"] +
          '" title="' +
          result["tags"] +
          '">    </a>';
      } else if (fileType === "swf") {
        div.innerHTML +=
          '<a href="' +
          fileUrl +
          '"><img src="swf-icon.png" title="' +
          result["tags"] +
          '">    </a>';
      } else {
        div.innerHTML +=
          '<a href="' +
          fileUrl +
          '"><img src="' +
          result["file_url"] +
          '" title="' +
          result["tags"] +
          '" alt="' +
          resultIndex +
          '">    </a>';
      }
    });
  }
}

/*
// GENERAL HELPER FUNCTIONS
*/

// advance to next page and automatically reload results
function pageNext() {
  verboseLog("User is moving to next page");
  currentPage++;
  updatePageNumber();
  getSearchQuery();
}

// go to previous page and automatically reload results
function pagePrevious() {
  verboseLog("User is moving to previous page");
  if (currentPage > 1) currentPage--;
  updatePageNumber();
  getSearchQuery();
}

// update the displayed page number
function updatePageNumber() {
  pageNumberElement = document.getElementById("pageNumber").innerText =
    "Page " + currentPage;
}

// Print to console only if verbose output is enabled
function verboseLog(text) {
  if (verboseOutput) console.log(text);
}
