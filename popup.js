(function () {
  "use strict";

  function t(key, subs) {
    return chrome.i18n.getMessage(key, subs) || key;
  }

  var RTL_LANGUAGES = ["ar", "he", "fa", "ur"];
  var uiLang = (chrome.i18n.getUILanguage() || "en").split("-")[0].toLowerCase();
  if (RTL_LANGUAGES.indexOf(uiLang) !== -1) {
    document.body.setAttribute("dir", "rtl");
  }

  document.title = t("extensionName");

  var elNotAvailableBanner  = document.getElementById("not-available-banner");
  var elNotAvailableText    = document.getElementById("not-available-text");
  var elMainContent         = document.getElementById("main-content");
  var elHeaderTitle         = document.getElementById("header-title");
  var elMasterToggle        = document.getElementById("master-toggle");
  var elMasterToggleSr      = document.getElementById("master-toggle-sr");
  var elControlsWrapper     = document.getElementById("controls-wrapper");
  var elModeTablist         = document.getElementById("mode-tablist");
  var elTabSimulation       = document.getElementById("tab-simulation");
  var elTabCorrection       = document.getElementById("tab-correction");
  var elFilterGrid          = document.getElementById("filter-grid");
  var elIntensitySection    = document.getElementById("intensity-section");
  var elIntensityLabel      = document.getElementById("intensity-label");
  var elIntensityValue      = document.getElementById("intensity-value");
  var elIntensitySlider     = document.getElementById("intensity-slider");
  var elCompareSection      = document.getElementById("compare-section");
  var elCompareBtn          = document.getElementById("compare-btn");
  var elExceptionsLabel     = document.getElementById("exceptions-label");
  var elExceptionToggle     = document.getElementById("exception-toggle");
  var elExceptionToggleSr   = document.getElementById("exception-toggle-sr");
  var elExceptionsList      = document.getElementById("exceptions-list");
  var elFooterNote          = document.getElementById("footer-note");
  var elInfoBtn             = document.getElementById("info-btn");
  var elInfoTooltip         = document.getElementById("info-tooltip");
  var elInfoTooltipText     = document.getElementById("info-tooltip-text");

  elHeaderTitle.textContent       = t("extensionName");
  elMasterToggleSr.textContent    = t("masterToggleLabel");
  elTabSimulation.textContent     = t("modeSimulation");
  elTabCorrection.textContent     = t("modeCorrection");
  elIntensityLabel.textContent    = t("intensityLabel");
  elCompareBtn.textContent        = t("compareButton");
  elExceptionsLabel.textContent   = t("disableOnSiteLabel");
  elExceptionToggleSr.textContent = t("disableOnSiteLabel");
  elFooterNote.textContent        = t("filterSourceNote");
  elInfoTooltipText.textContent   = t("infoTooltipText");
  elModeTablist.setAttribute("aria-label", t("modeTabsAriaLabel"));

  var state = {
    enabled:        false,
    selectedFilter: null,
    mode:           "correction",
    intensity:      100,
    exceptions:     [],
    currentHostname: "",
    isExcepted:     false,
    isAvailable:    true
  };

  var intensityDebounceTimer = null;
  var activeTab = null;

  var CATEGORY_KEYS = {
    red_green:   "categoryRedGreen",
    blue_yellow: "categoryBlueYellow",
    monochromacy:"categoryMonochromacy",
    correction:  "categoryCorrection"
  };

  function getActiveTab(cb) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs && tabs.length > 0) {
        cb(tabs[0]);
      } else {
        cb(null);
      }
    });
  }

  function sendToContentScript(message) {
    return new Promise(function (resolve, reject) {
      if (!activeTab || !activeTab.id) {
        reject(new Error("No active tab"));
        return;
      }
      chrome.tabs.sendMessage(activeTab.id, message, function (response) {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  function showNotAvailable() {
    state.isAvailable = false;
    elNotAvailableBanner.hidden = false;
    elNotAvailableText.textContent = t("notAvailableOnPage");
    elMainContent.hidden = true;
  }

  function initUI() {
    elMasterToggle.checked = state.enabled;
    updateControlsDimState();

    setActiveTab(state.mode);

    renderFilterGrid();

    elIntensitySlider.value = state.intensity;
    elIntensityValue.textContent = state.intensity + "%";
    elIntensitySlider.setAttribute("aria-valuenow", state.intensity);

    updateBottomSections();

    var hostname = state.currentHostname;
    state.isExcepted = state.exceptions.indexOf(hostname) !== -1;
    elExceptionToggle.checked = state.isExcepted;
    renderExceptionsList();
  }

  function updateControlsDimState() {
    if (state.enabled) {
      elControlsWrapper.classList.remove("dimmed");
      setControlsDisabled(false);
    } else {
      elControlsWrapper.classList.add("dimmed");
      setControlsDisabled(true);
    }
  }

  function setControlsDisabled(disabled) {
    var cards = elFilterGrid.querySelectorAll(".filter-card");
    cards.forEach(function (card) {
      card.setAttribute("aria-disabled", disabled ? "true" : "false");
      if (disabled) {
        card.removeAttribute("tabindex");
      } else {
        card.setAttribute("tabindex", "0");
      }
    });
    elIntensitySlider.disabled = disabled;
    elCompareBtn.disabled = disabled;
    elExceptionToggle.disabled = disabled;
  }

  function setActiveTab(mode) {
    state.mode = mode;
    [elTabSimulation, elTabCorrection].forEach(function (tab) {
      var isActive = tab.dataset.mode === mode;
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      tab.setAttribute("tabindex", isActive ? "0" : "-1");
    });
  }

  function renderFilterGrid() {
    elFilterGrid.innerHTML = "";

    if (typeof window.CVD_FILTERS === "undefined") {
      return;
    }

    var filters = window.CVD_FILTERS.filter(function (f) {
      return f.mode === state.mode;
    });

    filters.forEach(function (filterDef) {
      var card = createFilterCard(filterDef);
      elFilterGrid.appendChild(card);
    });

    updateCardSelection();

    if (!state.enabled) {
      setControlsDisabled(true);
    }
  }

  function createFilterCard(filterDef) {
    var card = document.createElement("div");
    card.className = "filter-card";
    card.dataset.filterId = filterDef.id;
    card.dataset.category = filterDef.category;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-pressed", state.selectedFilter === filterDef.id ? "true" : "false");
    card.setAttribute("aria-label",
      t(filterDef.nameKey) + ", " +
      t(CATEGORY_KEYS[filterDef.category] || "categoryCorrection") + ", " +
      t(filterDef.prevalenceKey)
    );

    var previewId = "cvd-preview-" + filterDef.id;

    var filterString = filterDef.svgFilter(100);
    var previewFilterString = filterString.replace(
      'id="' + filterDef.id + '"',
      'id="' + previewId + '"'
    );

    var svgStr =
      '<svg xmlns="http://www.w3.org/2000/svg" ' +
      'aria-hidden="true" focusable="false" ' +
      'style="position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;">' +
      '<defs>' + previewFilterString + '</defs>' +
      '</svg>';

    var swatchContainer = document.createElement("div");
    swatchContainer.className = "swatch-container";
    swatchContainer.style.cssText = "filter: url(#" + previewId + ");";

    card.insertAdjacentHTML("beforeend", svgStr);

    var swatchColors = [
      { cls: "swatch swatch--red",    label: "red"    },
      { cls: "swatch swatch--green",  label: "green"  },
      { cls: "swatch swatch--blue",   label: "blue"   },
      { cls: "swatch swatch--yellow", label: "yellow" },
      { cls: "swatch swatch--purple", label: "purple" }
    ];

    swatchColors.forEach(function (sw) {
      var span = document.createElement("span");
      span.className = sw.cls;
      span.setAttribute("aria-hidden", "true");
      swatchContainer.appendChild(span);
    });

    card.appendChild(swatchContainer);

    var nameEl = document.createElement("div");
    nameEl.className = "card-name";
    nameEl.textContent = t(filterDef.nameKey);
    card.appendChild(nameEl);

    var prevalenceEl = document.createElement("div");
    prevalenceEl.className = "card-prevalence";
    prevalenceEl.textContent = t(filterDef.prevalenceKey);
    card.appendChild(prevalenceEl);

    card.addEventListener("click", function () {
      if (!state.enabled) { return; }
      selectFilter(filterDef.id);
    });

    card.addEventListener("keydown", function (e) {
      if (!state.enabled) { return; }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectFilter(filterDef.id);
      }
    });

    return card;
  }

  function updateCardSelection() {
    var cards = elFilterGrid.querySelectorAll(".filter-card");
    cards.forEach(function (card) {
      var isSelected = card.dataset.filterId === state.selectedFilter;
      card.classList.toggle("selected", isSelected);
      card.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });
  }

  function selectFilter(filterId) {
    state.selectedFilter = filterId;
    updateCardSelection();
    updateBottomSections();

    if (state.enabled) {
      sendToContentScript({
        action:    "applyFilter",
        filterId:  filterId,
        intensity: state.intensity
      }).catch(function () {});
    }

    chrome.storage.local.set({ selectedFilter: filterId });
  }

  function updateBottomSections() {
    var show = state.enabled && !!state.selectedFilter;
    elIntensitySection.hidden = !show;
    elCompareSection.hidden   = !show;
  }

  function renderExceptionsList() {
    elExceptionsList.innerHTML = "";

    var exceptions = state.exceptions;
    var maxShown   = 3;
    var shown      = exceptions.slice(0, maxShown);
    var extra      = exceptions.length - maxShown;

    shown.forEach(function (hostname) {
      var li = document.createElement("li");
      li.className = "exception-item";

      var span = document.createElement("span");
      span.textContent = hostname;
      span.title = hostname;
      li.appendChild(span);

      var removeBtn = document.createElement("button");
      removeBtn.className = "exception-remove-btn";
      removeBtn.textContent = "\u00D7";
      removeBtn.setAttribute("aria-label", t("removeExceptionAriaLabel") + " " + hostname);
      removeBtn.setAttribute("type", "button");

      removeBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        removeException(hostname);
      });

      li.appendChild(removeBtn);
      elExceptionsList.appendChild(li);
    });

    if (extra > 0) {
      var moreLi = document.createElement("li");
      moreLi.className = "exceptions-more";
      moreLi.textContent = t("exceptionsMore", [String(extra)]);
      elExceptionsList.appendChild(moreLi);
    }
  }

  function addException(hostname) {
    if (state.exceptions.indexOf(hostname) === -1) {
      state.exceptions.push(hostname);
    }
    state.isExcepted = true;
    chrome.storage.local.set({ exceptions: state.exceptions });
    renderExceptionsList();

    sendToContentScript({ action: "setException", hostname: hostname, excepted: true })
      .catch(function () {});
  }

  function removeException(hostname) {
    state.exceptions = state.exceptions.filter(function (h) { return h !== hostname; });
    if (hostname === state.currentHostname) {
      state.isExcepted = false;
      elExceptionToggle.checked = false;
      if (state.enabled && state.selectedFilter) {
        sendToContentScript({
          action:    "applyFilter",
          filterId:  state.selectedFilter,
          intensity: state.intensity
        }).catch(function () {});
      }
    }
    chrome.storage.local.set({ exceptions: state.exceptions });
    renderExceptionsList();

    sendToContentScript({ action: "setException", hostname: hostname, excepted: false })
      .catch(function () {});
  }

  elMasterToggle.addEventListener("change", function () {
    state.enabled = elMasterToggle.checked;
    updateControlsDimState();
    updateBottomSections();
    chrome.storage.local.set({ enabled: state.enabled });

    if (state.enabled && state.selectedFilter && !state.isExcepted) {
      sendToContentScript({
        action:    "applyFilter",
        filterId:  state.selectedFilter,
        intensity: state.intensity
      }).catch(function () {});
    } else {
      sendToContentScript({ action: "removeFilter" }).catch(function () {});
    }
  });

  [elTabSimulation, elTabCorrection].forEach(function (tab) {
    tab.addEventListener("click", function () {
      var mode = tab.dataset.mode;
      if (state.mode === mode) { return; }
      setActiveTab(mode);
      renderFilterGrid();
      chrome.storage.local.set({ mode: mode });
    });
  });

  elModeTablist.addEventListener("keydown", function (e) {
    var tabs    = [elTabSimulation, elTabCorrection];
    var current = tabs.findIndex(function (t) { return t === document.activeElement; });
    if (current === -1) { return; }

    var next = -1;
    var isRTL = document.body.getAttribute("dir") === "rtl";

    if (e.key === "ArrowRight" || (!isRTL && e.key === "ArrowRight") ||
        (isRTL && e.key === "ArrowLeft")) {
      if (e.key === "ArrowRight") {
        next = (current + 1) % tabs.length;
      }
    }
    if (e.key === "ArrowLeft") {
      next = (current - 1 + tabs.length) % tabs.length;
    }
    if (e.key === "ArrowRight" && next === -1) {
      next = (current + 1) % tabs.length;
    }

    if (next !== -1) {
      e.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    }
  });

  elIntensitySlider.addEventListener("input", function () {
    var val = parseInt(elIntensitySlider.value, 10);
    elIntensityValue.textContent = val + "%";
    elIntensitySlider.setAttribute("aria-valuenow", val);

    if (intensityDebounceTimer) {
      clearTimeout(intensityDebounceTimer);
    }
    intensityDebounceTimer = setTimeout(function () {
      state.intensity = val;
      chrome.storage.local.set({ intensity: val });

      if (state.enabled && state.selectedFilter && !state.isExcepted) {
        sendToContentScript({
          action:    "applyFilter",
          filterId:  state.selectedFilter,
          intensity: val
        }).catch(function () {});
      }
    }, 50);
  });

  elCompareBtn.addEventListener("mousedown", function () {
    elCompareBtn.classList.add("comparing");
    sendToContentScript({ action: "pauseFilter" }).catch(function () {});
  });

  elCompareBtn.addEventListener("mouseup", function () {
    elCompareBtn.classList.remove("comparing");
    sendToContentScript({ action: "resumeFilter" }).catch(function () {});
  });

  elCompareBtn.addEventListener("mouseleave", function () {
    if (elCompareBtn.classList.contains("comparing")) {
      elCompareBtn.classList.remove("comparing");
      sendToContentScript({ action: "resumeFilter" }).catch(function () {});
    }
  });

  elCompareBtn.addEventListener("touchstart", function (e) {
    e.preventDefault();
    elCompareBtn.classList.add("comparing");
    sendToContentScript({ action: "pauseFilter" }).catch(function () {});
  }, { passive: false });

  elCompareBtn.addEventListener("touchend", function () {
    elCompareBtn.classList.remove("comparing");
    sendToContentScript({ action: "resumeFilter" }).catch(function () {});
  });

  elCompareBtn.addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.key === " ") && !elCompareBtn.classList.contains("comparing")) {
      e.preventDefault();
      elCompareBtn.classList.add("comparing");
      sendToContentScript({ action: "pauseFilter" }).catch(function () {});
    }
  });

  elCompareBtn.addEventListener("keyup", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      elCompareBtn.classList.remove("comparing");
      sendToContentScript({ action: "resumeFilter" }).catch(function () {});
    }
  });

  elExceptionToggle.addEventListener("change", function () {
    var hostname = state.currentHostname;
    if (!hostname) { return; }

    if (elExceptionToggle.checked) {
      addException(hostname);
    } else {
      removeException(hostname);
    }
  });

  elInfoBtn.addEventListener("click", function () {
    var isExpanded = elInfoBtn.getAttribute("aria-expanded") === "true";
    elInfoBtn.setAttribute("aria-expanded", isExpanded ? "false" : "true");
    elInfoTooltip.hidden = isExpanded;
  });

  document.addEventListener("click", function (e) {
    if (!elInfoBtn.contains(e.target) && !elInfoTooltip.contains(e.target)) {
      elInfoBtn.setAttribute("aria-expanded", "false");
      elInfoTooltip.hidden = true;
    }
  });

  function init() {
    getActiveTab(function (tab) {
      if (!tab) {
        showNotAvailable();
        return;
      }

      activeTab = tab;

      try {
        state.currentHostname = new URL(tab.url).hostname;
      } catch (e) {
        state.currentHostname = "";
      }

      chrome.tabs.sendMessage(tab.id, { action: "getStatus" }, function (response) {
        if (chrome.runtime.lastError || !response) {
          showNotAvailable();
          return;
        }

        chrome.storage.local.get(
          ["enabled", "selectedFilter", "mode", "intensity", "exceptions"],
          function (data) {
            state.enabled        = data.enabled        || false;
            state.selectedFilter = data.selectedFilter || null;
            state.mode           = data.mode           || "correction";
            state.intensity      = typeof data.intensity === "number" ? data.intensity : 100;
            state.exceptions     = data.exceptions     || [];

            initUI();
          }
        );
      });
    });
  }

  init();

}());
