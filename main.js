// TODO: implement color scheme switching (with saving settings)
// TODO: implement unique reactive default theme that changes based on selected site

// global variables for settings
var verboseOutput = false; // make the terminal vomit everything. default false
var horizontalOrder = true; // maintain horizontal order of search results. default true
var r18 = false; // allow R18+ search results. default false
var pageSize = 20; // size of results on page. default 20
var currentApi = "e621"; // current website API to pull from. default e621
refreshSettings(); // update settings with cookies (this doesn't write any cookies to the browser yet)

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

$(".modal").modal(); // make sure all modals are initialized

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
    itemSelector: ".grid-item",
    fitWidth: true,
    gutter: 10,
    horizontalOrder: horizontalOrder
});

// since the page just loaded, we need to check for URL parameters

// number of results per page
if (getQueryVariable("pagesize")) {
    verboseLog("Query variable exists for page size.");
    pageSize = getQueryVariable("pagesize");
} else {
    // non-destructively load cookie default to populate the box
    verboseLog("Attempting to load page size from cookie.");
    if (checkCookie("settings-pagesize")) {
        verboseLog("Cookie exists.");
        pageSize = getCookie("settings-pagesize");
    }
}

// initialize variable with API setting
if (getQueryVariable("api")) {
    currentApi = getQueryVariable("api");
    verboseLog("API set to " + currentApi + " via URL query variable");
}

// Make sure the box displays the current value
document.getElementById("resultAmount").value = pageSize;

// what page to display
if (getQueryVariable("page")) {
    currentPage = getQueryVariable("page");
    updatePageNumber();
}

// we came to this page intending to search something
if (getQueryVariable("search")) {
    var currentSearch = getQueryVariable("search");
    if (currentSearch === "false") currentSearch = ""; // make sure blank searches don't get stringified to "false"
    document.getElementById("tags").value = currentSearch.replaceAll("%20", " "); // de-URLify this for the textbox
    getSearchQuery(false); // automatically trigger search
}

function getSearchQuery(userTriggered) {
    // obtain tag query
    var tags = document.getElementById("tags").value;

    // user does not have R18 permissions, add safe tag
    if (!r18) {
        verboseLog("User has not enabled R18+ settings, manually enforcing rating:safe tag.");
        // make sure we aren't redundantly adding more
        if (!tags.includes("rating:safe")) {
            tags += "%20rating:safe";
        }
        // TODO: adjust auto-safe-query for e6/derpi
    }

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
            resultSize + // TODO: paginate on e669->e621 side - 320 max posts per query
            "&page=" +
            currentPage +
            "&tags=" +
            tags;
        // e621 enforces a hard limit of 320 posts per query.
        // To circumvent this, we need additional logic (and maybe a cookie?)
        // to manage the user-facing page separately from the API request page.
        // Derpibooru requires no such micromanaging as its more versatile search
        // queries remove the necessity for pagination on e669 like we do for e621.

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
            statusDiv.innerHTML = "";
        };

        // TODO: implement dropdown to switch between e621 and derpibooru (and eventually others)
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

        // TODO: add plus button to tags that add to search query, only visible on small screens

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
        verboseLog("Cookie " + cname + " exists. \n" + cookie);
        return true;
    } else {
        verboseLog("Cookie " + cname + " does not exist.");
        return false;
    }
}

// Settings button calls this function so we can init the settings cookies properly
function openSettings() {
    verboseLog("User is opening settings.");

    // make sure all cookies have been set
    if (!checkCookie("settings-verbose")) {
        verboseLog("settings-verbose cookie has not been set, go ahead and write it now");
        setCookie("settings-verbose", "false", 365);
    }

    if (!checkCookie("settings-horizontal")) {
        verboseLog("settings-horizontal cookie has not been set, go ahead and write it now");
        setCookie("settings-horizontal", "true", 365);
    }

    if (!checkCookie("settings-r18")) {
        verboseLog("settings-r18 cookie has not been set, go ahead and write it now");
        setCookie("settings-r18", "false", 365);
    }

    if (!checkCookie("settings-pagesize")) {
        verboseLog("settings-pagesize cookie has not been set, go ahead and write it now");
        setCookie("settings-pagesize", pageSize, 365);
    }

    // checkbox variables
    // these use JSON.parse to make sure it's correctly evaluated as a boolean
    var settingsVerbose = JSON.parse(getCookie("settings-verbose"));
    var settingsHorizontal = JSON.parse(getCookie("settings-horizontal"));
    var settingsr18 = JSON.parse(getCookie("settings-r18"));
    var settingsPagesize = parseInt(getCookie("settings-pagesize"));

    // set checkboxes based on cookies
    document.getElementById("verboseLogging").checked = settingsVerbose;
    document.getElementById("horizontalOrder").checked = settingsHorizontal;
    document.getElementById("r18").checked = settingsr18;
    document.getElementById("pageSize").value = settingsPagesize;

    verboseLog("Current settings should be, assuming nothing went wrong:\n" + settingsVerbose + "\n" + settingsHorizontal + "\n" + settingsPagesize);
    verboseLog("Actual current settings are:\n" + document.getElementById("verboseLogging").checked + "\n" + document.getElementById("horizontalOrder").checked + "\n" + document.getElementById("pageSize").value);

    $("#settingsModal").modal("open");
}

// Reads selected checkboxes on settings modal and writes the cookies with the selected values.
function saveSettings() {
    verboseLog("User is saving settings.");

    // make sure applicable values are valid settings
    if (document.getElementById("pageSize").value < 0) {
        verboseLog("User tried to set pageSize too low. Constraining to 0.");
        document.getElementById("pageSize").value = 0;
    } else if (document.getElementById("pageSize").value > 320) {
        verboseLog("User tried to set pageSize too high. Constraining to 320.");
        document.getElementById("pageSize").value = 320;
    }

    setCookie("settings-verbose", document.getElementById("verboseLogging").checked, 365);
    setCookie("settings-horizontal", document.getElementById("horizontalOrder").checked, 365);
    setCookie("settings-r18", document.getElementById("r18").checked, 365);
    setCookie("settings-pagesize", document.getElementById("pageSize").value, 365);

    // if user changed anything, make sure settings update accordingly
    refreshSettings();

    $("#settingsModal").modal("close");
}

// Update all relevant variables from the cookies
function refreshSettings() {
    verboseLog("Updating variables with settings from cookies (read-only)");
    // make extra certain we aren't writing anything before GDPR notice was accepted
    // these use JSON.parse to make sure it's correctly evaluated as a boolean
    if (checkCookie("settings-verbose")) {
        verboseOutput = JSON.parse(getCookie("settings-verbose"));
    }
    if (checkCookie("settings-horizontal")) {
        horizontalOrder = JSON.parse(getCookie("settings-horizontal"));
    }
    if (checkCookie("settings-r18")) {
        r18 = JSON.parse(getCookie("settings-r18"));
    }
    if (checkCookie("settings-pagesize")) {
        pageSize = parseInt(getCookie("settings-pagesize"));
    }

}

// delete ALL cookies and refresh the page
function deleteAllCookies() {
    verboseLog("User has selected to delete all cookies.");
    var cookies = document.cookie.split(";");
    for (var i = 0; i < cookies.length; i++) {
        verboseLog("Deleting cookie: " + cookies[i]);

        var cookieName = cookies[i].split("=")[0];
        deleteCookie(cookieName);
    }
    location.reload();
}

// Print to console only if verbose output is enabled
function verboseLog(text) {
    if (verboseOutput) console.log(text);
}

// replace all occurrences of a string, not just one
String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};
// enable enter key functionality on search box
document.getElementById("tags").addEventListener("keyup", function (event) {
    event.preventDefault();
    if (event.keyCode === 13) {
        getSearchQuery(true);
    }
});
