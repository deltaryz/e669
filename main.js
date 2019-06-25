// TODO: implement color scheme switching (with saving settings)
// TODO: implement unique reactive default theme that changes based on selected site
// TODO: implement basic bookmarking feature

// global variables for settings
var verboseOutput = false; // make the terminal vomit everything. default false
var horizontalOrder = true; // maintain horizontal order of search results. default true
var r18 = false; // allow R18+ search results. default false
var pageSize = 20; // size of results on page. default 20
var derpiApiKey = "false"; // derpibooru API key. default false
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

// make sure all modals and dropdowns are initialized
$(".modal").modal();
$('.dropdown-trigger').dropdown({"constrainWidth": false, "container": document.getElementById("main")});

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
    if (getQueryVariable("api") == "e621") {
        setApiE621();
    } else if (getQueryVariable("api") == "derpi") {
        setApiDerpi();
    }
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
    document.getElementById("tags").value = currentSearch.split("%20").join(' '); // de-URLify this for the textbox
    getSearchQuery(false); // automatically trigger search
}

function getSearchQuery(userTriggered) {
    // obtain tag query
    var tags = document.getElementById("tags").value;

    // user does not have R18 permissions, add safe tag
    if (!r18) {
        verboseLog("User has not enabled R18+ settings, manually enforcing rating:safe tag.");
        if (currentApi == "e621") {
            // make sure we aren't redundantly adding more
            if (!tags.includes("rating:safe")) {
                tags += "%20rating:safe";
            }
        } else if (currentApi == "derpi") {
            // make sure we aren't redundantly adding more
            if (!tags.includes("safe")) {
                tags += ",safe";
            }
        }
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

    // check if there are more than 6 tags being searched on e621
    if (splitTags.length > 6 && currentApi == "e621") {
        // let user know this is too many tags
        statusDiv.innerHTML =
            "<b>Your fetishes are getting really specific.</b><br/>7+ tag searches are still a work in progress. For now, keep your searches at 6 tags or less!";
    } else {
        // check desired results size
        var resultSize = document.getElementById("resultAmount").value;
        if (resultSize === "") resultSize = 20;

        // URL to request results from
        if (currentApi == "e621") {
            // e621 enforces a hard limit of 320 posts per query.
            // To circumvent this, we need additional logic (and maybe a cookie?)
            // to manage the user-facing page separately from the API request page.
            // Derpibooru requires no such micromanaging as its more versatile search
            // queries remove the necessity for pagination on e669 like we do for e621.
            requestURL =
                corsForwardURL +
                "e621.net:443/post/index.json?limit=" +
                resultSize + // TODO: paginate on e669->e621 side - 320 max posts per query
                "&page=" +
                currentPage +
                "&tags=" +
                tags;
        } else if (currentApi == "derpi") {
            requestURL =
                corsForwardURL +
                "derpibooru.org:443/search.json?perpage=" +
                resultSize +
                "&page=" +
                currentPage +
                "&q=" +
                tags +
                "&key=" +
                derpiApiKey;
        }

        // create request
        verboseLog("creating request to " + requestURL);
        var request = new XMLHttpRequest();
        request.open("GET", requestURL);
        request.responseType = "json";
        request.send();

        // once request loads
        request.onload = function () {
            verboseLog("Request has loaded");
            var results;
            if (currentApi == "derpi") {
                results = request.response["search"];
            } else if (currentApi == "e621") {
                results = request.response;
            }
            // TODO: add logic to paginate results
            appendResultsToPage(results); // Add results to page
            statusDiv.innerHTML = "";
        };

        // TODO: implement dropdown to switch between e621 and derpibooru (and eventually others)
    }

    // add all results to page
    function appendResultsToPage(resultsArray) {
        resultsArray.forEach(function (result) {

                // e621 API
                if (currentApi == "e621") {
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
                } else if (currentApi == "derpi") {
                    // convenience variables
                    const fileUrl = "https:" + result["image"];
                    const fileSampleUrl = "https:" + result["representations"]["thumb"];
                    const fileName = result["id"];
                    const fileType = result["original_format"];
                    const fileTags = result["tags"];
                    const fileId = result["id"];
                    const fileDescription = result["description"];

                    // get artists from tags
                    var artistName = [];
                    fileTags.split(", ").forEach(function (tag) {
                        if (tag.includes("artist:")) {
                            artistName.push(tag);
                        }
                    });

                    verboseLog("Appending image:\n" + fileUrl + "\n" + fileName);

                    // check if file is an SWF or WEBM
                    if (fileType === "webm") {
                        // this is a webm // TODO: modal popup for webms

                    } else {
                        // this is an image
                        var link = document.createElement("a"); // make the image clickable
                        //link.href = fileUrl; // clicking it will directly load the image
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
                }
            }
        );
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
    if (currentApi == "e621") {
        currentUrl = "https://e621.net/post/show/" + fileId;
    } else if (currentApi == "derpi") {
        currentUrl = "https://derpibooru.org/" + fileId;
    }
    currentId = fileId;
    $("#detailsModal").modal("open");
    document.getElementById("downloadButton").onclick = function () {
        download(currentUrl, "e" + currentId + "." + fileExtension);
    };
    document.getElementById("fullsizeButton").setAttribute("href", fileUrl);
    document.getElementById("e621Button").setAttribute("href", currentUrl);
    // make sure button reflects the correct site
    if (currentApi == "e621") {
        verboseLog("Current site is e621, changing button to 'E621'");
        document.getElementById("e621Button").innerText = "E621";
    } else if (currentApi == "derpi") {
        verboseLog("Current site is derpibooru, changing button to 'DERPIBOORU'");
        document.getElementById("e621Button").innerText = "DERPIBOORU";
    }
    document.getElementById("modalImage").innerHTML = "<img style='max-width: 100%' src='" + fileUrl + "' />";
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
    if (currentApi == "e621") {
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

        // if the image has sources, list them
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
    } else if (currentApi == "derpi") {
        modalMetadata.innerHTML =
            "Dimensions: " +
            result["width"] +
            "x" +
            result["height"] +
            "<br />" +
            "sha512: " +
            result["orig_sha512_hash"] +
            "<br/>" +
            "Score: " +
            result["score"] +
            "<br/>" +
            "Sources: ";

        // if the image has a source, display it
        if (result["source_url"]) {
            modalMetadata.innerHTML +=
                "<a class='btn-small blue' style='margin-right: 10px;' href='" +
                result["source_url"] +
                "'>" +
                "1" +
                "</a>";
        } else {
            modalMetadata.innerHTML += "(none)";
        }
    }

    var artistArray = artists;
    var modalArtists = document.getElementById("modalArtists");
    modalArtists.innerHTML = "";
    artistArray.forEach(function (tag) {
        var currentTag = document.createElement("a");

        if (currentApi == "e621") {
            currentTag.href =
                "?search=" +
                tag +
                "&api=e621" +
                "&pagesize=" +
                document.getElementById("resultAmount").value;
        } else if (currentApi == "derpi") {
            currentTag.href =
                "?search=" +
                tag +
                "&api=derpi" +
                "&pagesize=" +
                document.getElementById("resultAmount").value;
        }

        currentTag.setAttribute("class", "waves-effect waves-light btn blue");
        currentTag.setAttribute("style", "margin-right: 5px; margin-bottom: 5px;");
        currentTag.innerText = tag;

        currentTag.addEventListener("contextmenu", function (event) {
            addTagToSearch(tag);
            event.preventDefault();
        });

        currentTag.addEventListener("click", function (event) {
            event.preventDefault();

            if (currentApi == "e621") {
                window.location =
                    "?search=" +
                    tag +
                    "&api=e621" +
                    "&pagesize=" +
                    document.getElementById("resultAmount").value;
            } else if (currentApi == "derpi") {
                window.location =
                    "?search=" +
                    tag +
                    "&api=derpi" +
                    "&pagesize=" +
                    document.getElementById("resultAmount").value;
            }

            return false;
        });
        modalArtists.appendChild(currentTag);
    });

    // format tags correctly
    var tagArray;
    if (currentApi == "e621") {
        tagArray = tags.split(" ");
    } else if (currentApi == "derpi") {
        tagArray = tags.split(", ");
    }

    var modalTags = document.getElementById("modalTags");
    modalTags.innerHTML = "";
    tagArray.forEach(function (tag) {
        var currentTag = document.createElement("a");

        if (currentApi == "e621") {
            currentTag.href =
                "?search=" +
                tag +
                "&api=e621" +
                "&pagesize=" +
                document.getElementById("resultAmount").value;
        } else if (currentApi == "derpi") {
            currentTag.href =
                "?search=" +
                tag +
                "&api=derpi" +
                "&pagesize=" +
                document.getElementById("resultAmount").value;
        }

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

            if (currentApi == "e621") {
                window.location =
                    "?search=" +
                    tag +
                    "&api=e621" +
                    "&pagesize=" +
                    document.getElementById("resultAmount").value;
            } else if (currentApi == "derpi") {
                window.location =
                    "?search=" +
                    tag +
                    "&api=derpi" +
                    "&pagesize=" +
                    document.getElementById("resultAmount").value;
            }
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

    if (currentApi == "e621") {
        window.location =
            "?page=" +
            paramPage +
            "&api=e621" +
            "&search=" +
            paramSearch +
            "&pagesize=" +
            paramPageSize;
    } else if (currentApi == "derpi") {
        window.location =
            "?page=" +
            paramPage +
            "&api=derpi" +
            "&search=" +
            paramSearch +
            "&pagesize=" +
            paramPageSize;
    }

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
    if (currentApi == "e621") {
        document.getElementById("tags").value += " " + tag;
    } else if (currentApi == "derpi") {
        document.getElementById("tags").value += "," + tag;
    }
}

// update the displayed page number
function updatePageNumber() {
    pageNumberElement = document.getElementById(
        "pageNumber"
    ).innerText = currentPage;
}

// set site to e621
function setApiE621() {
    currentApi = "e621";
    document.getElementById("apiDropdownImage").setAttribute("src", "img/e621-icon.png")
}

// set site to derpibooru
function setApiDerpi() {
    currentApi = "derpi";
    document.getElementById("apiDropdownImage").setAttribute("src", "img/derpi-icon.png")
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

    if (!checkCookie("settings-derpiapikey")) {
        verboseLog("settings-derpiapikey cookie has not been set, go ahead and write it now");
        setCookie("settings-derpiapikey", "false", 365);
    }

    // checkbox variables
    // these use JSON.parse to make sure it's correctly evaluated as a boolean
    var settingsVerbose = JSON.parse(getCookie("settings-verbose"));
    var settingsHorizontal = JSON.parse(getCookie("settings-horizontal"));
    var settingsr18 = JSON.parse(getCookie("settings-r18"));
    var settingsPagesize = parseInt(getCookie("settings-pagesize"));
    var settingsDerpiApiKey = getCookie("settings-derpiapikey");

    // set checkboxes based on cookies
    document.getElementById("verboseLogging").checked = settingsVerbose;
    document.getElementById("horizontalOrder").checked = settingsHorizontal;
    document.getElementById("r18").checked = settingsr18;
    document.getElementById("pageSize").value = settingsPagesize;
    document.getElementById("derpiApiKey").value = settingsDerpiApiKey;

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
    setCookie("settings-derpiapikey", document.getElementById("derpiApiKey").value, 365);

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
    if (checkCookie("settings-derpiapikey")) {
        derpiApiKey = getCookie("settings-derpiapikey");
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

// enable enter key functionality on search box
document.getElementById("tags").addEventListener("keyup", function (event) {
    event.preventDefault();
    if (event.keyCode === 13) {
        getSearchQuery(true);
    }
});
