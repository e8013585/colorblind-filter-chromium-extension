(function () {
  "use strict";

  var SVG_CONTAINER_ID = "cvd-filter-defs";
  var STYLE_TAG_ID     = "cvd-filter-style";

  var currentFilterId  = null;
  var currentIntensity = 100;
  var filterPaused     = false;
  var isEnabled        = false;

  function ensureSVGContainer() {
    var existing = document.getElementById(SVG_CONTAINER_ID);
    if (existing) {
      return existing;
    }

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", SVG_CONTAINER_ID);
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.setAttribute(
      "style",
      "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;" +
      "top:0;left:0;visibility:hidden;"
    );

    var defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    svg.appendChild(defs);

    var target = document.body || document.documentElement;
    target.appendChild(svg);

    return svg;
  }

  function getDefsElement() {
    var svg = ensureSVGContainer();
    return svg.querySelector("defs");
  }

  function applyFilter(filterId, intensity) {
    if (!filterId) {
      return;
    }

    var filterEntry = null;
    if (typeof window.CVD_FILTERS !== "undefined") {
      for (var i = 0; i < window.CVD_FILTERS.length; i++) {
        if (window.CVD_FILTERS[i].id === filterId) {
          filterEntry = window.CVD_FILTERS[i];
          break;
        }
      }
    }

    if (!filterEntry) {
      console.warn("[CVD] Unknown filterId:", filterId);
      return;
    }

    currentFilterId  = filterId;
    currentIntensity = typeof intensity === "number" ? intensity : 100;

    var filterString = filterEntry.svgFilter(currentIntensity);

    var defs = getDefsElement();
    defs.innerHTML = filterString;

    var styleTag = document.getElementById(STYLE_TAG_ID);
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = STYLE_TAG_ID;
      var styleTarget = document.head || document.documentElement;
      styleTarget.appendChild(styleTag);
    }

    styleTag.textContent =
      "html { filter: url(#" + filterId + ") !important; }";

    isEnabled = true;
  }

  function removeFilter() {
    var styleTag = document.getElementById(STYLE_TAG_ID);
    if (styleTag) {
      styleTag.textContent = "";
    }

    var defs = getDefsElement();
    if (defs) {
      defs.innerHTML = "";
    }

    isEnabled = false;
  }

  function pauseFilter() {
    filterPaused = true;
    var styleTag = document.getElementById(STYLE_TAG_ID);
    if (styleTag) {
      styleTag.textContent = "";
    }
  }

  function resumeFilter() {
    filterPaused = false;
    if (currentFilterId && isEnabled) {
      applyFilter(currentFilterId, currentIntensity);
    }
  }

  function checkExceptions() {
    return new Promise(function (resolve) {
      chrome.storage.local.get(["exceptions"], function (data) {
        var exceptions = data.exceptions || [];
        var hostname   = window.location.hostname;
        resolve(exceptions.indexOf(hostname) !== -1);
      });
    });
  }

  function initFromStorage() {
    chrome.storage.local.get(
      ["enabled", "selectedFilter", "intensity", "exceptions"],
      function (data) {
        var enabled        = data.enabled        || false;
        var selectedFilter = data.selectedFilter || null;
        var intensity      = typeof data.intensity === "number" ? data.intensity : 100;
        var exceptions     = data.exceptions     || [];
        var hostname       = window.location.hostname;
        var isExcepted     = exceptions.indexOf(hostname) !== -1;

        if (enabled && selectedFilter && !isExcepted) {
          applyFilter(selectedFilter, intensity);
        } else {
          removeFilter();
          currentFilterId  = selectedFilter;
          currentIntensity = intensity;
          isEnabled        = enabled && !isExcepted;
        }
      }
    );
  }

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (!message || !message.action) {
      return false;
    }

    switch (message.action) {

      case "getStatus":
        sendResponse({
          enabled:        isEnabled,
          selectedFilter: currentFilterId,
          intensity:      currentIntensity,
          videoCount:     0,
          frameCount:     1
        });
        return false;

      case "applyFilter":
        checkExceptions().then(function (excepted) {
          if (!excepted) {
            applyFilter(message.filterId, message.intensity);
          }
        });
        return false;

      case "removeFilter":
        removeFilter();
        currentFilterId = null;
        return false;

      case "pauseFilter":
        pauseFilter();
        return false;

      case "resumeFilter":
        resumeFilter();
        return false;

      case "setException":
        if (message.excepted) {
          removeFilter();
        } else {
          initFromStorage();
        }
        return false;

      case "init":
        initFromStorage();
        return false;

      default:
        return false;
    }
  });

  initFromStorage();

}());
