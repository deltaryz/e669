var verboseOutput = true;
var currentPage = 1;

var grid = $(".grid");

var lastSearchTags = "";
var requestURL = "https://cors-anywhere.herokuapp.com/https://e621.net/";
var corsForwardURL = "https://cors-anywhere.herokuapp.com/";

var currentUrl = "";
var currentId = "";
var currentExt = "";

// initialize Masonry
grid.masonry({
  // options
  itemSelector: ".grid-item",
  fitWidth: true,
  gutter: 10
});

// since the page just loaded, we need to check for URL parameters
if (getQueryVariable("pagesize")) {
  document.getElementById("resultAmount").value = getQueryVariable("pagesize");
}

if (getQueryVariable("search")) {
  // we came to this page intending to search something
  document.getElementById("tags").value = getQueryVariable("search");
  getSearchQuery();
}

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
      $(".modal").modal(); // make sure all modals are initialized
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
      const fileId = result["id"];
      const artistName = result["artist"];
      const fileDescription = result["description"];
      const pageUrl = "https://e621.net/post/show/" + result["id"];

      verboseLog("Appending image:\n" + fileUrl + "\n" + fileName);

      // check if file is an SWF or WEBM
      if (fileType === "webm") {
        // this is a webm // TODO: modal popup for webms
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
        // this is an swf // TODO: modal popup for swfs
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
        link.addEventListener("click", function(event) {
          showDetailsModal(
            fileTags,
            fileId,
            artistName,
            fileType,
            fileUrl,
            fileDescription,
            result
          );
          event.preventDefault();
        });

        // build the grid
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

function showDetailsModal(
  tags,
  fileId,
  artists,
  fileExtension,
  fileUrl,
  fileDescription,
  result
) {
  currentUrl = "https://e621.net/post/show/" + fileId;
  currentId = fileId;
  $("#detailsModal").modal("open");
  document.getElementById("downloadButton").onclick = function() {
    download(currentUrl, "e" + currentId + "." + fileExtension);
  };
  document.getElementById("fullsizeButton").setAttribute("href", fileUrl);
  document.getElementById("e621Button").setAttribute("href", currentUrl);
  document.getElementById("modalImage").innerHTML =
    "<img style='max-width: 100%' src='" + fileUrl + "' />";
  document.getElementById("modalDesc").innerHTML = fileDescription;
  var modalMetadata = document.getElementById("modalMetadata");
  modalMetadata.innerHTML =
    "Dimensions: " +
    result["width"] +
    "x" +
    result["height"] +
    "<br />" +
    "MD5: " +
    result["md5"] +
    "<br/>" +
    "Rating: " +
    result["rating"] +
    "<br/>" +
    "Sources: ";

  if (result["sources"]) {
    result["sources"].forEach(function(source, index) {
      modalMetadata.innerHTML +=
        "<a href='" + source + "'>" + ++index + "</a>        ";
    });
  } else {
    modalMetadata.innerHTML += "(none)";
  }

  var artistArray = artists;
  var modalArtists = document.getElementById("modalArtists");
  modalArtists.innerHTML = "";
  artistArray.forEach(function(tag) {
    var currentTag = document.createElement("a");
    currentTag.href =
      "https://e669.fun/?search=" +
      tag +
      "&pagesize=" +
      document.getElementById("resultAmount").value;
    currentTag.setAttribute("class", "waves-effect waves-light btn indigo");
    currentTag.setAttribute("style", "margin-right: 5px; margin-bottom: 5px;");
    currentTag.innerText = tag;

    currentTag.addEventListener("contextmenu", function(event) {
      addTagToSearch(tag);
      event.preventDefault();
    });

    currentTag.addEventListener("click", function(event) {
      event.preventDefault();
      window.location =
        "https://e669.fun/?search=" +
        tag +
        "&pagesize=" +
        document.getElementById("resultAmount").value;
      return false;
    });
    modalArtists.appendChild(currentTag);
  });

  var tagArray = tags.split(" ");
  var modalTags = document.getElementById("modalTags");
  modalTags.innerHTML = "";
  tagArray.forEach(function(tag) {
    var currentTag = document.createElement("a");
    currentTag.href =
      "https://e669.fun/?search=" +
      tag +
      "&pagesize=" +
      document.getElementById("resultAmount").value;
    currentTag.setAttribute("class", "waves-effect waves-light btn blue");
    currentTag.setAttribute("style", "margin-right: 5px; margin-bottom: 5px;");
    currentTag.innerText = tag;

    currentTag.addEventListener("contextmenu", function(event) {
      addTagToSearch(tag);
      event.preventDefault();
    });

    currentTag.addEventListener("click", function(event) {
      event.preventDefault();
      window.location =
        "https://e669.fun/?search=" +
        tag +
        "&pagesize=" +
        document.getElementById("resultAmount").value;
      return false;
    });
    modalTags.appendChild(currentTag);
  });
}

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

// allows using URL variables
function getQueryVariable(variable) {
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    if (pair[0] == variable) {
      return pair[1];
    }
  }
  return false;
}

// add a tag to the existing searchbox
function addTagToSearch(tag) {
  document.getElementById("tags").value += " " + tag;
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
