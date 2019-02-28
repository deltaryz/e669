var verboseOutput = true;
var currentPage = 1;

var grid = $(".grid");

var lastSearchTags = "";
var requestURL = "https://cors-anywhere.herokuapp.com/https://e621.net/";
var corsForwardURL = "https://cors-anywhere.herokuapp.com/";

// initialize Masonry
grid.masonry({
  // options
  itemSelector: ".grid-item",
  fitWidth: true,
  gutter: 10
});

function getSearchQuery() {
  // scroll back to top
  window.scrollTo(0, 0);

  // clear current grid
  grid.masonry("remove", grid.find(".grid-item"));

  // obtain tag query
  var tags = document.getElementById("tags").value;

  // status indicator
  const statusDiv = document.getElementById("status"); // div on page to append results

  // Loading indicator
  statusDiv.innerHTML = "<b>Loading, please wait...</b>";

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
    statusDiv.innerHTML =
      "<b>Your fetishes are getting really specific.</b><br/>7+ tag searches are still a work in progress. For now, keep your searches at 6 tags or less!";
  } else {
    // check desired results size
    var resultSize = document.getElementById("resultAmount").value;
    if (resultSize === "") resultSize = 20;

    // if the user searched a new query, reset to page 1
    if (lastSearchTags !== tags) {
      currentPage = 1;
      document.getElementById("btnPreviousPage").classList.add("disabled");
      updatePageNumber();
      lastSearchTags = tags;
    }

    // URL to request results from
    requestURL =
      "https://cors-anywhere.herokuapp.com/https://e621.net/post/index.json?limit=" +
      resultSize +
      "&page=" + // TODO: replace this service with own service
      currentPage +
      "&tags=" +
      tags;

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

      appendResultsToPage(results); // Add results to page
      statusDiv.innerHTML = "";
    };
  }

  // add all results to page
  function appendResultsToPage(resultsArray) {
    resultsArray.forEach(function(result) {
      // convenience variables
      const fileUrl = result["file_url"];
      const fileSampleUrl = result["sample_url"];
      const fileName = result["artist"] + " - " + result["md5"];
      const fileType = result["file_ext"];
      const fileTags = result["tags"];
      const artistName = result["artist"];
      const pageUrl = "https://e621.net/post/show/" + result["id"];

      verboseLog("Appending image:\n" + fileUrl + "\n" + fileName);

      // check if file is an SWF or WEBM
      if (fileType === "webm") {
        // this is a webm
        var link = document.createElement("a"); // make the image clickable
        link.href = fileUrl;
        var image = document.createElement("img");
        image.classList.add("grid-item", "tooltipped", "webm-shadow"); // make sure it has a tooltip
        image.setAttribute("data-position", "bottom"); // tooltip at bottom
        image.setAttribute("data-tooltip", artistName); // tooltip has artist name
        image.title = fileTags; // mouseover should display tags
        image.src = fileSampleUrl; // it's a webm so we have to show a preview
        link.appendChild(image);

        $(".grid")
          .append(link)
          .masonry("appended", link)
          .imagesLoaded()
          .progress(function() {
            $(document).ready(function() {
              $(".tooltipped").tooltip();
            });
            $(".grid").masonry();
          });
      } else if (fileType === "swf") {
        // this is am swf
        var link = document.createElement("a"); // make the image clickable
        link.href = fileUrl;
        var image = document.createElement("img");
        image.classList.add("grid-item", "tooltipped", "swf-shadow"); // make sure it has a tooltip
        image.setAttribute("data-position", "bottom"); // tooltip at bottom
        image.setAttribute("data-tooltip", artistName); // tooltip has artist name
        image.title = fileTags; // mouseover should display tags
        image.src = "img/swf-icon.png"; // it's an swf so we have to indicate this
        link.appendChild(image);

        $(".grid")
          .append(link)
          .masonry("appended", link)
          .imagesLoaded()
          .progress(function() {
            $(document).ready(function() {
              $(".tooltipped").tooltip();
            });
            $(".grid").masonry();
          });
      } else {
        // this is an image
        var link = document.createElement("a"); // make the image clickable
        link.href = fileUrl; // clicking it will directly load the image
        var image = document.createElement("img");
        image.classList.add("grid-item", "tooltipped"); // make sure it has a tooltip
        image.setAttribute("data-position", "bottom"); // tooltip at bottom
        image.setAttribute("data-tooltip", artistName); // tooltip has artist name
        image.title = fileTags; // mouseover should display tags
        image.src = fileSampleUrl;
        link.appendChild(image);

        $(".grid")
          .append(link)
          .masonry("appended", link)
          .imagesLoaded()
          .progress(function() {
            $(document).ready(function() {
              $(".tooltipped").tooltip();
            });
            $(".grid").masonry();
          });
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
  document.getElementById("btnPreviousPage").classList.remove("disabled");
  updatePageNumber();
  getSearchQuery();
}

// go to previous page and automatically reload results
function pagePrevious() {
  verboseLog("User is moving to previous page");
  if (currentPage > 1) {
    currentPage--;
    if (currentPage == 1) {
      document.getElementById("btnPreviousPage").classList.add("disabled");
    }
  }
  updatePageNumber();
  getSearchQuery();
}

// update the displayed page number
function updatePageNumber() {
  pageNumberElement = document.getElementById(
    "pageNumber"
  ).innerText = currentPage;
}

// Print to console only if verbose output is enabled
function verboseLog(text) {
  if (verboseOutput) console.log(text);
}

// enable enter key functionality on search box
document.getElementById("tags").addEventListener("keyup", function(event) {
  event.preventDefault();
  if (event.keyCode === 13) {
    getSearchQuery();
  }
});
