// for things that have nowhere else to go . . .
// TODO: create modal dialog for user settings (use one cookie and split the string in the function)
// TODO: in user settings dialog, add toggle for horizontal order
// TODO: in user settings dialog, add toggle for verbose logging (off by default)

var verboseOutput = true; // make the terminal vomit everything
var currentPage = 1;

// Before anything else, we need to check for cookies for a GDPR notice
verboseLog("Checking if GDPR cookie exists...");
if (checkCookie("gdpr")) {
    // cookie does exist!
    verboseLog("GDPR cookie is present.");
} else {
    // cookie does not exist
    verboseLog("GDPR cookie is NOT present. Displaying cookie notice.");
    // TODO: update this to be a proper on-page modal and not a janky JS prompt()
    alert("This website uses cookies to store personal settings. By closing or dismissing this notice, or by continuing to browse this website, you accept the use of cookies.");
    verboseLog("User closes the dialog and thus consents to cookies.");
    setCookie("gdpr", "true", 365);
}

var grid = $(".grid"); // fine, i'll use jquery ._.

// URL query vars
var lastSearchTags = "";
var requestURL = ""; // init for later
var corsForwardURL = "https://cors.e669.fun/";

// ethereal page navigation or traditional?
var etherealNavigation = false; // default false for now

// these need to be init'd globally for the modal dialog
var currentUrl = "";
var currentId = "";
var currentExt = "";

// initialize Masonry
grid.masonry({
    // options
    // TODO: grab these from cookies
    itemSelector: ".grid-item",
    fitWidth: true,
    gutter: 10,
    horizontalOrder: true
});

// since the page just loaded, we need to check for URL parameters

// number of results per page
if (getQueryVariable("pagesize")) {
    document.getElementById("resultAmount").value = getQueryVariable("pagesize");
}

// what page to display
if (getQueryVariable("page")) {
    currentPage = getQueryVariable("page");
    updatePageNumber();
}

// we came to this page intending to search something
if (getQueryVariable("search")) {
    var currentSearch = getQueryVariable("search");
    if (currentSearch === "false") currentSearch = ""; // make sure blank searches don't get stringified to "false"
    document.getElementById("tags").value = currentSearch.replace("%20", " "); // de-URLify this for the textbox
    getSearchQuery(false); // automatically trigger search
}

function getSearchQuery(userTriggered) {
    // obtain tag query
    var tags = document.getElementById("tags").value;

    // if the user searched a new query, reset to page 1
    if (lastSearchTags !== tags && userTriggered) {
        if (etherealNavigation) {
            currentPage = 1;
            document.getElementById("btnPreviousPage").classList.add("disabled");
            updatePageNumber();
        } else {
            reloadPage(1, tags);
        }
    }

    // so we can later pull the current search more easily
    lastSearchTags = tags;

    // scroll back to top
    window.scrollTo(0, 0);

    // clear current grid
    grid.masonry("remove", grid.find(".grid-item"));

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

        // URL to request results from
        requestURL =
            corsForwardURL +
            "e621.net:443/post/index.json?limit=" +
            resultSize + // TODO: change this to large number (200+) for pagination on our end
            "&page=" +
            currentPage +
            "&tags=" +
            tags;

        // TODO: add logic to format derpibooru request

        // create request
        verboseLog("creating request to " + requestURL);
        var request = new XMLHttpRequest();
        request.open("GET", requestURL);
        request.responseType = "json";
        request.send();

        // once request loads
        request.onload = function () {
            verboseLog("Request has loaded");
            var results = request.response;
            // TODO: add logic to paginate results
            appendResultsToPage(results); // Add results to page
            $(".modal").modal(); // make sure all modals are initialized
            statusDiv.innerHTML = "";
        };

        // TODO: find way to delay function until two separate requests finish loading (mayhaps do them sequentially?)
        // TODO: Add logic to splice together derpibooru and e621 results (configurable sort methods?)
    }

    // add all results to page
    function appendResultsToPage(resultsArray) {
        resultsArray.forEach(function (result) {
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
                    .progress(function () {
                        $(document).ready(function () {
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
                    .progress(function () {
                        $(document).ready(function () {
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
                link.addEventListener("click", function (event) {
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
                    .progress(function () {
                        $(document).ready(function () {
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
    document.getElementById("downloadButton").onclick = function () {
        download(currentUrl, "e" + currentId + "." + fileExtension);
    };
    document.getElementById("fullsizeButton").setAttribute("href", fileUrl);
    document.getElementById("e621Button").setAttribute("href", currentUrl);
    document.getElementById("modalImage").innerHTML =
        "<img style='max-width: 100%' src='" + fileUrl + "' />";
    if (fileDescription != "") {
        document
            .getElementById("modalDesc")
            .setAttribute(
                "style",
                "background-color: #E5E5E5; border-radius: 3px; padding: 10px 10px;"
            );
        document.getElementById("modalDesc").innerHTML = fileDescription;
    } else {
        document.getElementById("modalDesc").setAttribute("style", "");
        document.getElementById("modalDesc").innerHTML = fileDescription;
    }
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
        result["sources"].forEach(function (source, index) {
            modalMetadata.innerHTML +=
                "<a class='btn-small blue' style='margin-right: 10px;' href='" +
                source +
                "'>" +
                ++index +
                "</a>";
        });
    } else {
        modalMetadata.innerHTML += "(none)";
    }

    var artistArray = artists;
    var modalArtists = document.getElementById("modalArtists");
    modalArtists.innerHTML = "";
    artistArray.forEach(function (tag) {
        var currentTag = document.createElement("a");
        currentTag.href =
            "?search=" +
            tag +
            "&pagesize=" +
            document.getElementById("resultAmount").value;
        currentTag.setAttribute("class", "waves-effect waves-light btn blue");
        currentTag.setAttribute("style", "margin-right: 5px; margin-bottom: 5px;");
        currentTag.innerText = tag;

        currentTag.addEventListener("contextmenu", function (event) {
            addTagToSearch(tag);
            event.preventDefault();
        });

        currentTag.addEventListener("click", function (event) {
            event.preventDefault();
            window.location =
                "?search=" +
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
    tagArray.forEach(function (tag) {
        var currentTag = document.createElement("a");
        currentTag.href =
            "?search=" +
            tag +
            "&pagesize=" +
            document.getElementById("resultAmount").value;
        currentTag.setAttribute(
            "class",
            "waves-effect waves-light btn-flat grey lighten-2"
        );
        currentTag.setAttribute(
            "style",
            "margin-right: 5px; margin-bottom: 10px; font-size: 11px !important;"
        );
        currentTag.innerText = tag;

        currentTag.addEventListener("contextmenu", function (event) {
            addTagToSearch(tag);
            event.preventDefault();
        });

        currentTag.addEventListener("click", function (event) {
            event.preventDefault();
            window.location =
                "?search=" +
                tag +
                "&pagesize=" +
                document.getElementById("resultAmount").value;
            return false;
        });
        modalTags.appendChild(currentTag);
    });
}

// load page with new url
function reloadPage(paramPage, paramSearch, paramPageSize) {
    if (!paramPage) paramPage = currentPage;
    if (!paramSearch) paramSearch = document.getElementById("tags").value;
    if (!paramPageSize)
        paramPageSize = document.getElementById("resultAmount").value;

    window.location =
        "?page=" +
        paramPage +
        "&search=" +
        paramSearch +
        "&pagesize=" +
        paramPageSize;
}

// advance to next page and automatically reload results
function pageNext() {
    if (etherealNavigation) {
        verboseLog("User is moving to next page");
        currentPage++;
        document.getElementById("btnPreviousPage").classList.remove("disabled");
        updatePageNumber();
        getSearchQuery(true);
    } else {
        reloadPage(++currentPage, lastSearchTags);
    }
}

// go to previous page and automatically reload results
function pagePrevious() {
    if (etherealNavigation) {
        verboseLog("User is moving to previous page");
        if (currentPage > 1) {
            currentPage--;
            if (currentPage == 1) {
                document.getElementById("btnPreviousPage").classList.add("disabled");
            }
        }
        updatePageNumber();
        getSearchQuery(true);
    } else {
        reloadPage(--currentPage, lastSearchTags);
    }
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

// set/create a browser cookie
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

// delete a browser cookie
function deleteCookie(cname) {
    verboseLog("Deleting cookie: " + cname);
    var d = new Date();
    d.setTime(d.getTime() - 1);
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + "get rekt" + ";" + expires + ";path=/";
}

// get a browser cookie (returns blank if it doesn't exist)
function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

// check if a cookie exists
function checkCookie(cname) {
    verboseLog("Checking if cookie exists: " + cname);
    var cookie = getCookie(cname);
    if (cookie != "") {
        verboseLog("Cookie exists. \n" + cookie);
        return true;
    } else {
        verboseLog("Cookie does not exist.");
        return false;
    }
}

// Print to console only if verbose output is enabled
function verboseLog(text) {
    if (verboseOutput) console.log(text);
}

// enable enter key functionality on search box
document.getElementById("tags").addEventListener("keyup", function (event) {
    event.preventDefault();
    if (event.keyCode === 13) {
        getSearchQuery(true);
    }
});
