"use strict";

var STORAGE_DEFAULTS = {
  enabled:        false,
  selectedFilter: null,
  mode:           "correction",
  intensity:      100,
  exceptions:     []
};

chrome.runtime.onInstalled.addListener(function (details) {
  chrome.storage.local.get(Object.keys(STORAGE_DEFAULTS), function (stored) {
    var toSet = {};
    Object.keys(STORAGE_DEFAULTS).forEach(function (key) {
      if (typeof stored[key] === "undefined") {
        toSet[key] = STORAGE_DEFAULTS[key];
      }
    });
    if (Object.keys(toSet).length > 0) {
      chrome.storage.local.set(toSet);
    }
  });
});

function sendFilterToTab(tabId, tabUrl) {
  if (!tabUrl || (!tabUrl.startsWith("http://") && !tabUrl.startsWith("https://"))) {
    return;
  }

  chrome.storage.local.get(
    ["enabled", "selectedFilter", "intensity", "exceptions"],
    function (data) {
      var enabled        = data.enabled        || false;
      var selectedFilter = data.selectedFilter || null;
      var intensity      = typeof data.intensity === "number" ? data.intensity : 100;
      var exceptions     = data.exceptions     || [];

      var hostname = "";
      try {
        hostname = new URL(tabUrl).hostname;
      } catch (e) {
        return;
      }

      var isExcepted = exceptions.indexOf(hostname) !== -1;

      var message;
      if (enabled && selectedFilter && !isExcepted) {
        message = { action: "applyFilter", filterId: selectedFilter, intensity: intensity };
      } else {
        message = { action: "removeFilter" };
      }

      chrome.tabs.sendMessage(tabId, message, function () {
        if (chrome.runtime.lastError) { /* intentionally ignored */ }
      });
    }
  );
}

chrome.tabs.onActivated.addListener(function (activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function (tab) {
    if (chrome.runtime.lastError || !tab) { return; }
    sendFilterToTab(tab.id, tab.url);
  });
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === "complete") {
    sendFilterToTab(tabId, tab.url);
  }
});
