/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* import-globals-from extensionControlled.js */
/* import-globals-from preferences.js */

/* FIXME: ESlint globals workaround should be removed once bug 1395426 gets fixed */
/* globals DownloadUtils, LoadContextInfo */

ChromeUtils.import("resource://gre/modules/AppConstants.jsm");
ChromeUtils.import("resource://gre/modules/PluralForm.jsm");

ChromeUtils.defineModuleGetter(this, "PluralForm",
  "resource://gre/modules/PluralForm.jsm");
ChromeUtils.defineModuleGetter(this, "LoginHelper",
  "resource://gre/modules/LoginHelper.jsm");
ChromeUtils.defineModuleGetter(this, "SiteDataManager",
  "resource:///modules/SiteDataManager.jsm");

ChromeUtils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");

XPCOMUtils.defineLazyPreferenceGetter(this, "contentBlockingUiEnabled",
                                      "browser.contentblocking.ui.enabled");

XPCOMUtils.defineLazyPreferenceGetter(this, "contentBlockingCookiesAndSiteDataRejectTrackersRecommended",
                                      "browser.contentblocking.cookies-site-data.ui.reject-trackers.recommended");

XPCOMUtils.defineLazyPreferenceGetter(this, "contentBlockingCookiesAndSiteDataRejectTrackersEnabled",
                                      "browser.contentblocking.cookies-site-data.ui.reject-trackers.enabled");

XPCOMUtils.defineLazyPreferenceGetter(this, "contentBlockingFastBlockUiEnabled",
                                      "browser.contentblocking.fastblock.ui.enabled");

XPCOMUtils.defineLazyPreferenceGetter(this, "contentBlockingTrackingProtectionUiEnabled",
                                      "browser.contentblocking.trackingprotection.ui.enabled");

XPCOMUtils.defineLazyPreferenceGetter(this, "contentBlockingRejectTrackersUiEnabled",
                                      "browser.contentblocking.rejecttrackers.ui.enabled");

XPCOMUtils.defineLazyPreferenceGetter(this, "contentBlockingRejectTrackersRecommended",
                                      "browser.contentblocking.rejecttrackers.ui.recommended");

XPCOMUtils.defineLazyPreferenceGetter(this, "contentBlockingEnabled",
                                      "browser.contentblocking.enabled");

const PREF_UPLOAD_ENABLED = "datareporting.healthreport.uploadEnabled";

const TRACKING_PROTECTION_KEY = "websites.trackingProtectionMode";
const TRACKING_PROTECTION_PREFS = ["privacy.trackingprotection.enabled",
                                   "privacy.trackingprotection.pbmode.enabled"];

const PREF_OPT_OUT_STUDIES_ENABLED = "app.shield.optoutstudies.enabled";
const PREF_NORMANDY_ENABLED = "app.normandy.enabled";

XPCOMUtils.defineLazyGetter(this, "AlertsServiceDND", function() {
  try {
    let alertsService = Cc["@mozilla.org/alerts-service;1"]
      .getService(Ci.nsIAlertsService)
      .QueryInterface(Ci.nsIAlertsDoNotDisturb);
    // This will throw if manualDoNotDisturb isn't implemented.
    alertsService.manualDoNotDisturb;
    return alertsService;
  } catch (ex) {
    return undefined;
  }
});

Preferences.addAll([
  // Content Blocking
  { id: "browser.contentblocking.enabled", type: "bool" },

  // FastBlock
  { id: "browser.fastblock.enabled", type: "bool" },

  // Tracking Protection
  { id: "privacy.trackingprotection.enabled", type: "bool" },
  { id: "privacy.trackingprotection.pbmode.enabled", type: "bool" },
  // This isn't a configuration pref, rather it's for saving the previous state
  // of the UI when we turn off the TP controls when the user checks off the
  // All Detected Trackers under Content Blocking.  This pref isn't listed in
  // all.js/firefox.js to make sure it doesn't appear in about:config by default.
  { id: "browser.privacy.trackingprotection.menu", type: "string" },

  // Button prefs
  { id: "pref.privacy.disable_button.cookie_exceptions", type: "bool" },
  { id: "pref.privacy.disable_button.view_cookies", type: "bool" },
  { id: "pref.privacy.disable_button.change_blocklist", type: "bool" },
  { id: "pref.privacy.disable_button.tracking_protection_exceptions", type: "bool" },

  // Location Bar
  { id: "browser.urlbar.autocomplete.enabled", type: "bool" },
  { id: "browser.urlbar.suggest.bookmark", type: "bool" },
  { id: "browser.urlbar.suggest.history", type: "bool" },
  { id: "browser.urlbar.suggest.openpage", type: "bool" },

  // History
  { id: "places.history.enabled", type: "bool" },
  { id: "browser.formfill.enable", type: "bool" },
  { id: "privacy.history.custom", type: "bool" },
  // Cookies
  { id: "network.cookie.cookieBehavior", type: "int" },
  { id: "network.cookie.lifetimePolicy", type: "int" },
  { id: "network.cookie.blockFutureCookies", type: "bool" },
  // Clear Private Data
  { id: "privacy.sanitize.sanitizeOnShutdown", type: "bool" },
  { id: "privacy.sanitize.timeSpan", type: "int" },
  // Do not track
  { id: "privacy.donottrackheader.enabled", type: "bool" },

  // Media
  { id: "media.autoplay.default", type: "int" },
  { id: "media.autoplay.enabled.ask-permission", type: "bool" },
  { id: "media.autoplay.enabled.user-gestures-needed", type: "bool" },

  // Popups
  { id: "dom.disable_open_during_load", type: "bool" },
  // Passwords
  { id: "signon.rememberSignons", type: "bool" },

  // Buttons
  { id: "pref.privacy.disable_button.view_passwords", type: "bool" },
  { id: "pref.privacy.disable_button.view_passwords_exceptions", type: "bool" },

  /* Certificates tab
   * security.default_personal_cert
   *   - a string:
   *       "Select Automatically"   select a certificate automatically when a site
   *                                requests one
   *       "Ask Every Time"         present a dialog to the user so he can select
   *                                the certificate to use on a site which
   *                                requests one
   */
  { id: "security.default_personal_cert", type: "string" },

  { id: "security.disable_button.openCertManager", type: "bool" },

  { id: "security.disable_button.openDeviceManager", type: "bool" },

  { id: "security.OCSP.enabled", type: "int" },

  // Add-ons, malware, phishing
  { id: "xpinstall.whitelist.required", type: "bool" },

  { id: "browser.safebrowsing.malware.enabled", type: "bool" },
  { id: "browser.safebrowsing.phishing.enabled", type: "bool" },

  { id: "browser.safebrowsing.downloads.enabled", type: "bool" },

  { id: "urlclassifier.malwareTable", type: "string" },

  { id: "browser.safebrowsing.downloads.remote.block_potentially_unwanted", type: "bool" },
  { id: "browser.safebrowsing.downloads.remote.block_uncommon", type: "bool" },

]);

// Study opt out
if (AppConstants.MOZ_DATA_REPORTING) {
  Preferences.addAll([
    // Preference instances for prefs that we need to monitor while the page is open.
    { id: PREF_OPT_OUT_STUDIES_ENABLED, type: "bool" },
    { id: PREF_UPLOAD_ENABLED, type: "bool" },
  ]);
}

// Data Choices tab
if (AppConstants.NIGHTLY_BUILD) {
  Preferences.add({ id: "browser.chrome.errorReporter.enabled", type: "bool" });
}
if (AppConstants.MOZ_CRASHREPORTER) {
  Preferences.add({ id: "browser.crashReports.unsubmittedCheck.autoSubmit2", type: "bool" });
}

function setEventListener(aId, aEventType, aCallback) {
  document.getElementById(aId)
    .addEventListener(aEventType, aCallback.bind(gPrivacyPane));
}

var gPrivacyPane = {
  _pane: null,

  /**
   * Whether the prompt to restart Firefox should appear when changing the autostart pref.
   */
  _shouldPromptForRestart: true,

  /**
   * Initialize the tracking protection prefs and linkify its Learn More link.
   */
  _initTrackingProtection() {
    setEventListener("trackingProtectionRadioGroup", "command",
      this.trackingProtectionWritePrefs);
    setEventListener("changeBlockList", "command", this.showBlockLists);

    let link = document.getElementById("trackingProtectionLearnMore");
    let url = Services.urlFormatter.formatURLPref("app.support.baseURL") + "tracking-protection";
    link.setAttribute("href", url);
  },

  /**
   * Update the tracking protection UI to deal with extension control.
   */
  _updateTrackingProtectionUI() {
    let isLocked = TRACKING_PROTECTION_PREFS.some(
      pref => Services.prefs.prefIsLocked(pref));

    function setInputsDisabledState(isControlled) {
      let disabled = isLocked || isControlled;
      if (contentBlockingUiEnabled) {
        let tpCheckbox =
          document.getElementById("contentBlockingTrackingProtectionCheckbox");
        // Only enable the TP menu if content blocking and Detect All Trackers
        // are enabled.
        document.getElementById("trackingProtectionMenu").disabled = disabled ||
          !tpCheckbox.checked ||
          !contentBlockingEnabled;
        // Only enable the TP category checkbox if content blocking is enabled.
        tpCheckbox.disabled = disabled || !contentBlockingEnabled;
      } else {
        document.querySelectorAll("#trackingProtectionRadioGroup > radio")
          .forEach((element) => {
            element.disabled = disabled;
          });
        document.querySelector("#trackingProtectionDesc > label")
          .disabled = disabled;
      }

      // Notify observers that the TP UI has been updated.
      // This is needed since our tests need to be notified about the
      // trackingProtectionMenu element getting disabled/enabled at the right time.
      Services.obs.notifyObservers(window, "privacy-pane-tp-ui-updated");
    }

    if (isLocked) {
      // An extension can't control this setting if either pref is locked.
      hideControllingExtension(TRACKING_PROTECTION_KEY);
      setInputsDisabledState(false);
    } else {
      handleControllingExtension(
        PREF_SETTING_TYPE,
        TRACKING_PROTECTION_KEY)
          .then(setInputsDisabledState);
    }
  },

  /**
   * Set up handlers for showing and hiding controlling extension info
   * for tracking protection.
   */
  _initTrackingProtectionExtensionControl() {
    let disableButton = contentBlockingUiEnabled ?
      "contentBlockingDisableTrackingProtectionExtension" : "disableTrackingProtectionExtension";
    setEventListener(disableButton, "command",
      makeDisableControllingExtension(
        PREF_SETTING_TYPE, TRACKING_PROTECTION_KEY));

    let trackingProtectionObserver = {
      observe(subject, topic, data) {
        gPrivacyPane._updateTrackingProtectionUI();
      },
    };

    for (let pref of TRACKING_PROTECTION_PREFS) {
      Services.prefs.addObserver(pref, trackingProtectionObserver);
    }
    window.addEventListener("unload", () => {
      for (let pref of TRACKING_PROTECTION_PREFS) {
        Services.prefs.removeObserver(pref, trackingProtectionObserver);
      }
    });
  },

  /**
   * Initialize autocomplete to ensure prefs are in sync.
   */
  _initAutocomplete() {
    Cc["@mozilla.org/autocomplete/search;1?name=unifiedcomplete"]
      .getService(Ci.mozIPlacesAutoComplete);
  },

  /**
   * Sets up the UI for the number of days of history to keep, and updates the
   * label of the "Clear Now..." button.
   */
  init() {
    this._updateSanitizeSettingsButton();
    this.initializeHistoryMode();
    this.initAutoplay();
    this.updateAutoplayMediaControlsVisibility();
    this.updateHistoryModePane();
    this.updatePrivacyMicroControls();
    this.initAutoStartPrivateBrowsingReverter();
    this._initAutocomplete();

    /* Initialize Content Blocking / Tracking Protection */

    if (contentBlockingUiEnabled) {
      this.initContentBlocking();
    } else {
      this._initTrackingProtection();
    }

    this.trackingProtectionReadPrefs();
    this.networkCookieBehaviorReadPrefs();
    this._initTrackingProtectionExtensionControl();

    this.updateContentBlockingVisibility();

    Preferences.get("privacy.trackingprotection.enabled").on("change",
      gPrivacyPane.trackingProtectionReadPrefs.bind(gPrivacyPane));
    Preferences.get("privacy.trackingprotection.pbmode.enabled").on("change",
      gPrivacyPane.trackingProtectionReadPrefs.bind(gPrivacyPane));

    // Watch all of the prefs that the new Cookies & Site Data UI depends on
    Preferences.get("network.cookie.cookieBehavior").on("change",
      gPrivacyPane.networkCookieBehaviorReadPrefs.bind(gPrivacyPane));
    Preferences.get("network.cookie.lifetimePolicy").on("change",
      gPrivacyPane.networkCookieBehaviorReadPrefs.bind(gPrivacyPane));
    Preferences.get("browser.privatebrowsing.autostart").on("change",
      gPrivacyPane.networkCookieBehaviorReadPrefs.bind(gPrivacyPane));

    setEventListener("trackingProtectionExceptions", "command",
      gPrivacyPane.showTrackingProtectionExceptions);

    Preferences.get("privacy.sanitize.sanitizeOnShutdown").on("change",
      gPrivacyPane._updateSanitizeSettingsButton.bind(gPrivacyPane));
    Preferences.get("browser.privatebrowsing.autostart").on("change",
      gPrivacyPane.updatePrivacyMicroControls.bind(gPrivacyPane));
    Preferences.get("media.autoplay.enabled.ask-permission").on("change",
     gPrivacyPane.updateAutoplayMediaControlsVisibility.bind(gPrivacyPane));
    Preferences.get("media.autoplay.enabled.user-gestures-needed").on("change",
     gPrivacyPane.updateAutoplayMediaControlsVisibility.bind(gPrivacyPane));
    setEventListener("historyMode", "command", function() {
      gPrivacyPane.updateHistoryModePane();
      gPrivacyPane.updateHistoryModePrefs();
      gPrivacyPane.updatePrivacyMicroControls();
      gPrivacyPane.updateAutostart();
    });
    setEventListener("clearHistoryButton", "command", function() {
      let historyMode = document.getElementById("historyMode");
      // Select "everything" in the clear history dialog if the
      // user has set their history mode to never remember history.
      gPrivacyPane.clearPrivateDataNow(historyMode.value == "dontremember");
    });
    setEventListener("openSearchEnginePreferences", "click", function(event) {
      if (event.button == 0) {
        gotoPref("search");
      }
      return false;
    });
    setEventListener("privateBrowsingAutoStart", "command",
      gPrivacyPane.updateAutostart);
    setEventListener("cookieExceptions", "command",
      gPrivacyPane.showCookieExceptions);
    setEventListener("clearDataSettings", "command",
      gPrivacyPane.showClearPrivateDataSettings);
    setEventListener("passwordExceptions", "command",
      gPrivacyPane.showPasswordExceptions);
    setEventListener("useMasterPassword", "command",
      gPrivacyPane.updateMasterPasswordButton);
    setEventListener("changeMasterPassword", "command",
      gPrivacyPane.changeMasterPassword);
    setEventListener("showPasswords", "command",
      gPrivacyPane.showPasswords);
    setEventListener("addonExceptions", "command",
      gPrivacyPane.showAddonExceptions);
    setEventListener("viewCertificatesButton", "command",
      gPrivacyPane.showCertificates);
    setEventListener("viewSecurityDevicesButton", "command",
      gPrivacyPane.showSecurityDevices);

    this._pane = document.getElementById("panePrivacy");
    this._initMasterPasswordUI();
    this._initSafeBrowsing();

    setEventListener("notificationSettingsButton", "command",
      gPrivacyPane.showNotificationExceptions);
    setEventListener("locationSettingsButton", "command",
      gPrivacyPane.showLocationExceptions);
    setEventListener("cameraSettingsButton", "command",
      gPrivacyPane.showCameraExceptions);
    setEventListener("microphoneSettingsButton", "command",
      gPrivacyPane.showMicrophoneExceptions);
    setEventListener("popupPolicyButton", "command",
      gPrivacyPane.showPopupExceptions);
    setEventListener("autoplayMediaCheckbox", "command",
      gPrivacyPane.toggleAutoplayMedia);
    setEventListener("autoplayMediaPolicyButton", "command",
      gPrivacyPane.showAutoplayMediaExceptions);
    setEventListener("autoplayMediaPolicyComboboxButton", "command",
      gPrivacyPane.showAutoplayMediaExceptions);
    setEventListener("notificationsDoNotDisturb", "command",
      gPrivacyPane.toggleDoNotDisturbNotifications);

    if (AlertsServiceDND) {
      let notificationsDoNotDisturbBox =
        document.getElementById("notificationsDoNotDisturbBox");
      notificationsDoNotDisturbBox.removeAttribute("hidden");
      let checkbox = document.getElementById("notificationsDoNotDisturb");
      document.l10n.setAttributes(checkbox, "permissions-notification-pause");
      if (AlertsServiceDND.manualDoNotDisturb) {
        let notificationsDoNotDisturb =
          document.getElementById("notificationsDoNotDisturb");
        notificationsDoNotDisturb.setAttribute("checked", true);
      }
    }

    this.initSiteDataControls();

    setEventListener("clearSiteDataButton", "command",
      gPrivacyPane.clearSiteData);
    setEventListener("siteDataSettings", "command",
      gPrivacyPane.showSiteDataSettings);
    let url = Services.urlFormatter.formatURLPref("app.support.baseURL") + "storage-permissions";
    document.getElementById("siteDataLearnMoreLink").setAttribute("href", url);

    let notificationInfoURL =
      Services.urlFormatter.formatURLPref("app.support.baseURL") + "push";
    document.getElementById("notificationPermissionsLearnMore").setAttribute("href",
      notificationInfoURL);
    let drmInfoURL =
      Services.urlFormatter.formatURLPref("app.support.baseURL") + "drm-content";
    document.getElementById("playDRMContentLink").setAttribute("href", drmInfoURL);
    let emeUIEnabled = Services.prefs.getBoolPref("browser.eme.ui.enabled");
    // Force-disable/hide on WinXP:
    if (navigator.platform.toLowerCase().startsWith("win")) {
      emeUIEnabled = emeUIEnabled && parseFloat(Services.sysinfo.get("version")) >= 6;
    }
    if (!emeUIEnabled) {
      // Don't want to rely on .hidden for the toplevel groupbox because
      // of the pane hiding/showing code potentially interfering:
      document.getElementById("drmGroup").setAttribute("style", "display: none !important");
    }

    if (AppConstants.MOZ_DATA_REPORTING) {
      this.initDataCollection();
      if (AppConstants.NIGHTLY_BUILD) {
        this.initCollectBrowserErrors();
      }
      if (AppConstants.MOZ_CRASHREPORTER) {
        this.initSubmitCrashes();
      }
      this.initSubmitHealthReport();
      setEventListener("submitHealthReportBox", "command",
        gPrivacyPane.updateSubmitHealthReport);
      this.initOptOutStudyCheckbox();
    }
    this._initA11yState();
    let signonBundle = document.getElementById("signonBundle");
    let pkiBundle = document.getElementById("pkiBundle");
    appendSearchKeywords("showPasswords", [
      signonBundle.getString("loginsDescriptionAll2"),
    ]);
    appendSearchKeywords("viewSecurityDevicesButton", [
      pkiBundle.getString("enable_fips"),
    ]);

    if (!PrivateBrowsingUtils.enabled) {
      document.getElementById("privateBrowsingAutoStart").hidden = true;
      document.querySelector("menuitem[value='dontremember']").hidden = true;
    }

    // Notify observers that the UI is now ready
    Services.obs.notifyObservers(window, "privacy-pane-loaded");
  },

  initSiteDataControls() {
    Services.obs.addObserver(this, "sitedatamanager:sites-updated");
    Services.obs.addObserver(this, "sitedatamanager:updating-sites");
    let unload = () => {
      window.removeEventListener("unload", unload);
      Services.obs.removeObserver(this, "sitedatamanager:sites-updated");
      Services.obs.removeObserver(this, "sitedatamanager:updating-sites");
    };
    window.addEventListener("unload", unload);
    SiteDataManager.updateSites();
  },

  // CONTENT BLOCKING

  /**
   * Initializes the content blocking section.
   */
  initContentBlocking() {
    let contentBlockingCheckbox = document.getElementById("contentBlockingCheckbox");
    setEventListener("contentBlockingToggle", "command",
      () => contentBlockingCheckbox.click());
    setEventListener("contentBlockingToggle", "command",
      this.updateContentBlockingControls);
    setEventListener("changeBlockListLink", "click", this.showBlockLists);
    setEventListener("contentBlockingRestoreDefaults", "command",
      this.restoreContentBlockingPrefs);
    setEventListener("contentBlockingTrackingProtectionCheckbox", "command",
      this.trackingProtectionWritePrefs);
    setEventListener("contentBlockingTrackingProtectionCheckbox", "command",
      this._updateTrackingProtectionUI);
    setEventListener("trackingProtectionMenu", "command",
      this.trackingProtectionWritePrefs);
    setEventListener("contentBlockingChangeCookieSettings", "command",
      this.changeCookieSettings);
    setEventListener("contentBlockingBlockCookiesCheckbox", "command",
      this.writeBlockCookiesCheckbox);

    Preferences.get("network.cookie.cookieBehavior").on("change",
      gPrivacyPane.readBlockCookiesCheckbox.bind(gPrivacyPane));

    this.readBlockCookiesCheckbox();

    let link = document.getElementById("contentBlockingLearnMore");
    let url = Services.urlFormatter.formatURLPref("app.support.baseURL") + "tracking-protection";
    link.setAttribute("href", url);

    // Honour our Content Blocking category UI prefs. If each pref is set to false,
    // Make all descendants of the corresponding selector hidden.
    let selectorPrefMap = {
      ".fast-block-ui": contentBlockingFastBlockUiEnabled,
      ".tracking-protection-ui": contentBlockingTrackingProtectionUiEnabled,
      ".reject-trackers-ui": contentBlockingRejectTrackersUiEnabled,
    };

    for (let selector in selectorPrefMap) {
      let pref = selectorPrefMap[selector];
      if (!pref) {
        let elements = document.querySelectorAll(selector);
        for (let element of elements) {
          element.hidden = true;
        }
      }
    }

    // Allow turning off the "(recommended)" label using a pref
    let blockCookiesFromTrackers = document.getElementById("blockCookiesFromTrackersCB");
    if (contentBlockingRejectTrackersRecommended) {
      document.l10n.setAttributes(blockCookiesFromTrackers, "content-blocking-reject-trackers-block-trackers-option-recommended");
    }
  },

  /**
   * Resets all user-exposed content blocking preferences to their default values.
   */
  async restoreContentBlockingPrefs() {
    function clearIfNotLocked(pref) {
      if (!Services.prefs.prefIsLocked(pref)) {
        Services.prefs.clearUserPref(pref);
      }
    }

    clearIfNotLocked("browser.contentblocking.enabled");
    clearIfNotLocked("browser.fastblock.enabled");
    clearIfNotLocked("urlclassifier.trackingTable");
    clearIfNotLocked("network.cookie.cookieBehavior");
    clearIfNotLocked("network.cookie.lifetimePolicy");

    let controllingExtension = await getControllingExtension(
      PREF_SETTING_TYPE, TRACKING_PROTECTION_KEY);
    if (!controllingExtension) {
      for (let preference of TRACKING_PROTECTION_PREFS) {
        clearIfNotLocked(preference);
      }
    }
  },

  /**
   * Highlights the Cookies & Site Data UI section.
   */
  changeCookieSettings() {
    gotoPref("privacy-sitedata");
  },

  /**
   * Changes the visibility of elements in the TP/CB section depending on the
   * content blocking UI pref.
   */
  updateContentBlockingVisibility() {
    // First, update the content blocking UI.
    let visibleState = {
      "contentBlockingHeader": true,
      "contentBlockingDescription": true,
      "contentBlockingLearnMore": true,
      "contentBlockingRestoreDefaults": true,
      "contentBlockingCheckboxContainer": true,
      "contentBlockingCategories": true,

      "trackingProtectionHeader": false,
      "trackingProtectionDescription": false,
      "trackingProtectionBox": false,
    };
    for (let id in visibleState) {
      document.getElementById(id).hidden = contentBlockingUiEnabled != visibleState[id];
    }

    if (contentBlockingUiEnabled) {
      // Update the Do Not Track section to not mention "Tracking Protection".
      let dntDefaultRadioItem =
        document.querySelector("#doNotTrackRadioGroup > radio[value=false]");
      document.l10n.setAttributes(
        dntDefaultRadioItem, "do-not-track-option-default-content-blocking");

      // Potentially hide the global toggle.
      document.getElementById("contentBlockingCheckboxContainer").hidden =
        !Services.prefs.getBoolPref("browser.contentblocking.global-toggle.enabled", true);
    }

    // Allow turning off the "(recommended)" label using a pref
    let blockCookiesFromTrackers = document.getElementById("blockCookiesFromTrackers");
    if (contentBlockingCookiesAndSiteDataRejectTrackersRecommended) {
      document.l10n.setAttributes(blockCookiesFromTrackers, "sitedata-block-trackers-option-recommended");
    }

    // Allow hiding the Reject Trackers option based on a pref
    if (!contentBlockingCookiesAndSiteDataRejectTrackersEnabled) {
      blockCookiesFromTrackers.remove();
    }
  },

  /**
   * Updates the preferences UI to reflect the browser.contentblocking.enabled pref.
   * This affects the button to toggle the pref and the disabled state of the dependent controls.
   */
  updateContentBlockingToggle() {
    let onOrOff = contentBlockingEnabled ? "on" : "off";
    let contentBlockingToggle = document.getElementById("contentBlockingToggle");
    let contentBlockingToggleLabel = document.getElementById("contentBlockingToggleLabel");

    document.l10n.setAttributes(contentBlockingToggle,
      "content-blocking-toggle-" + onOrOff);
    contentBlockingToggle.setAttribute("aria-pressed", contentBlockingEnabled);
    document.l10n.setAttributes(contentBlockingToggleLabel,
      "content-blocking-toggle-label-" + onOrOff);

    this.updateContentBlockingControls();
  },

  /**
   * Changes the disabled state of controls that depend on the browser.contentblocking.enabled pref.
   */
  updateContentBlockingControls() {
    let dependentControls = [
      "#content-blocking-categories-label",
      ".content-blocking-checkbox",
      "#changeBlockListLink",
      "#contentBlockingChangeCookieSettings",
      "#blockCookiesCB, #blockCookiesCB > radio",
      "#blockCookies, #blockCookies > radio",
    ];

    this._toggleControls(dependentControls, contentBlockingEnabled);

    // The list of dependent controls here would normally include #blockCookiesLabel,
    // #blockCookiesMenu, #keepUntil and #keepCookiesUntil, but in order to avoid
    // having two parts of the code responsible for figuring out whether these
    // controls must be enabled or disabled, we offload that responsibility to
    // networkCookieBehaviorReadPrefs() which already knows how to deal with it.
    this.networkCookieBehaviorReadPrefs();

    // If Content Blocking gets disabled, show the warning in the Cookies and Site Data section.
    let blockCookiesWarning = document.getElementById("blockCookiesWarning");
    blockCookiesWarning.hidden = contentBlockingEnabled;

    // Need to make sure we account for pref locking/extension overrides when enabling the TP menu.
    this._updateTrackingProtectionUI();

    // If we are turning Content Blocking on, we may need to keep some parts of the Third-Party Cookies
    // UI off, depending on the value of the cookieBehavior pref.  readBlockCookiesCheckbox() can do
    // the work that is needed for that.
    this.readBlockCookiesCheckbox();
  },

  _toggleControls(dependentControls, enabled) {
    for (let selector of dependentControls) {
      let controls = document.querySelectorAll(selector);

      for (let control of controls) {
        if (enabled) {
          control.removeAttribute("disabled");
        } else {
          control.setAttribute("disabled", "true");
        }
      }
    }
  },

  // TRACKING PROTECTION MODE

  /**
   * Selects the right item of the Tracking Protection radiogroup.
   */
  trackingProtectionReadPrefs() {
    let enabledPref = Preferences.get("privacy.trackingprotection.enabled");
    let pbmPref = Preferences.get("privacy.trackingprotection.pbmode.enabled");
    let btpmPref = Preferences.get("browser.privacy.trackingprotection.menu");
    let tpControl,
        tpCheckbox;
    if (contentBlockingUiEnabled) {
      tpControl = document.getElementById("trackingProtectionMenu");
      tpCheckbox = document.getElementById("contentBlockingTrackingProtectionCheckbox");
    } else {
      tpControl = document.getElementById("trackingProtectionRadioGroup");
    }

    let savedMenuValue;
    if (contentBlockingUiEnabled) {
      // Only look at the backup pref when restoring the checkbox next to
      // "All Detected Trackers".
      if (["always", "private"].includes(btpmPref.value) &&
          tpCheckbox.checked) {
        savedMenuValue = btpmPref.value;
      }
    }

    this._updateTrackingProtectionUI();

    // Global enable takes precedence over enabled in Private Browsing.
    if (enabledPref.value) {
      tpControl.value = "always";
      if (tpCheckbox) {
        tpCheckbox.checked = true;
      }
    } else if (pbmPref.value) {
      tpControl.value = "private";
      if (tpCheckbox) {
        tpCheckbox.checked = true;
      }
    } else if (!tpCheckbox) {
      tpControl.value = "never";
    } else {
      if (savedMenuValue) {
        tpControl.value = savedMenuValue;
      }
      tpCheckbox.checked = false;
    }
  },

  /**
   * Selects the right items of the new Cookies & Site Data UI.
   */
  networkCookieBehaviorReadPrefs() {
    let behavior = Preferences.get("network.cookie.cookieBehavior").value;
    let blockCookiesCtrl = document.getElementById("blockCookies");
    let blockCookiesLabel = document.getElementById("blockCookiesLabel");
    let blockCookiesMenu = document.getElementById("blockCookiesMenu");
    let keepUntilLabel = document.getElementById("keepUntil");
    let keepUntilMenu = document.getElementById("keepCookiesUntil");

    let disabledByCB = contentBlockingUiEnabled ? !contentBlockingEnabled : false;
    let blockCookies = (behavior != 0);
    let cookieBehaviorLocked = Services.prefs.prefIsLocked("network.cookie.cookieBehavior");
    let blockCookiesControlsDisabled = !blockCookies || cookieBehaviorLocked || disabledByCB;
    blockCookiesLabel.disabled = blockCookiesMenu.disabled = blockCookiesControlsDisabled;

    let completelyBlockCookies = (behavior == 2);
    let privateBrowsing = Preferences.get("browser.privatebrowsing.autostart").value;
    let cookieExpirationLocked = Services.prefs.prefIsLocked("network.cookie.lifetimePolicy");
    let keepUntilControlsDisabled = privateBrowsing || completelyBlockCookies ||
                                    cookieExpirationLocked || disabledByCB;
    keepUntilLabel.disabled = keepUntilMenu.disabled = keepUntilControlsDisabled;

    switch (behavior) {
      case Ci.nsICookieService.BEHAVIOR_ACCEPT:
        blockCookiesCtrl.value = "allow";
        break;
      case Ci.nsICookieService.BEHAVIOR_REJECT_FOREIGN:
        blockCookiesCtrl.value = "disallow";
        blockCookiesMenu.value = "all-third-parties";
        break;
      case Ci.nsICookieService.BEHAVIOR_REJECT:
        blockCookiesCtrl.value = "disallow";
        blockCookiesMenu.value = "always";
        break;
      case Ci.nsICookieService.BEHAVIOR_LIMIT_FOREIGN:
        blockCookiesCtrl.value = "disallow";
        blockCookiesMenu.value = "unvisited";
        break;
      case Ci.nsICookieService.BEHAVIOR_REJECT_TRACKER:
        blockCookiesCtrl.value = "disallow";
        blockCookiesMenu.value = "trackers";
        break;
    }
  },

  /**
   * Sets the pref values based on the selected item of the radiogroup.
   */
  trackingProtectionWritePrefs() {
    let enabledPref = Preferences.get("privacy.trackingprotection.enabled");
    let pbmPref = Preferences.get("privacy.trackingprotection.pbmode.enabled");
    let btpmPref = Preferences.get("browser.privacy.trackingprotection.menu");
    let tpControl,
        tpCheckbox;
    if (contentBlockingUiEnabled) {
      tpControl = document.getElementById("trackingProtectionMenu");
      tpCheckbox = document.getElementById("contentBlockingTrackingProtectionCheckbox");
    } else {
      tpControl = document.getElementById("trackingProtectionRadioGroup");
    }

    let value;
    if (tpCheckbox) {
      if (tpCheckbox.checked) {
        value = tpControl.value;
        btpmPref.value = value;
      } else {
        value = "never";
      }
    } else {
      value = tpControl.value;
    }

    switch (value) {
      case "always":
        enabledPref.value = true;
        pbmPref.value = true;
        break;
      case "private":
        enabledPref.value = false;
        pbmPref.value = true;
        break;
      case "never":
        enabledPref.value = false;
        pbmPref.value = false;
        break;
    }
  },

  // HISTORY MODE

  /**
   * The list of preferences which affect the initial history mode settings.
   * If the auto start private browsing mode pref is active, the initial
   * history mode would be set to "Don't remember anything".
   * If ALL of these preferences are set to the values that correspond
   * to keeping some part of history, and the auto-start
   * private browsing mode is not active, the initial history mode would be
   * set to "Remember everything".
   * Otherwise, the initial history mode would be set to "Custom".
   *
   * Extensions adding their own preferences can set values here if needed.
   */
  prefsForKeepingHistory: {
    "places.history.enabled": true, // History is enabled
    "browser.formfill.enable": true, // Form information is saved
    "privacy.sanitize.sanitizeOnShutdown": false, // Private date is NOT cleared on shutdown
  },

  /**
   * The list of control IDs which are dependent on the auto-start private
   * browsing setting, such that in "Custom" mode they would be disabled if
   * the auto-start private browsing checkbox is checked, and enabled otherwise.
   *
   * Extensions adding their own controls can append their IDs to this array if needed.
   */
  dependentControls: [
    "rememberHistory",
    "rememberForms",
    "alwaysClear",
    "clearDataSettings",
  ],

  /**
   * Check whether preferences values are set to keep history
   *
   * @param aPrefs an array of pref names to check for
   * @returns boolean true if all of the prefs are set to keep history,
   *                  false otherwise
   */
  _checkHistoryValues(aPrefs) {
    for (let pref of Object.keys(aPrefs)) {
      if (Preferences.get(pref).value != aPrefs[pref])
        return false;
    }
    return true;
  },

  /**
   * Initialize the history mode menulist based on the privacy preferences
   */
  initializeHistoryMode() {
    let mode;
    let getVal = aPref => Preferences.get(aPref).value;

    if (getVal("privacy.history.custom"))
      mode = "custom";
    else if (this._checkHistoryValues(this.prefsForKeepingHistory)) {
      if (getVal("browser.privatebrowsing.autostart"))
        mode = "dontremember";
      else
        mode = "remember";
    } else
      mode = "custom";

    document.getElementById("historyMode").value = mode;
  },

  /**
   * Update the selected pane based on the history mode menulist
   */
  updateHistoryModePane() {
    let selectedIndex = -1;
    switch (document.getElementById("historyMode").value) {
      case "remember":
        selectedIndex = 0;
        break;
      case "dontremember":
        selectedIndex = 1;
        break;
      case "custom":
        selectedIndex = 2;
        break;
    }
    document.getElementById("historyPane").selectedIndex = selectedIndex;
    Preferences.get("privacy.history.custom").value = selectedIndex == 2;
  },

  /**
   * Update the private browsing auto-start pref and the history mode
   * micro-management prefs based on the history mode menulist
   */
  updateHistoryModePrefs() {
    let pref = Preferences.get("browser.privatebrowsing.autostart");
    switch (document.getElementById("historyMode").value) {
      case "remember":
        if (pref.value)
          pref.value = false;

        // select the remember history option if needed
        Preferences.get("places.history.enabled").value = true;

        // select the remember forms history option
        Preferences.get("browser.formfill.enable").value = true;

        // select the clear on close option
        Preferences.get("privacy.sanitize.sanitizeOnShutdown").value = false;
        break;
      case "dontremember":
        if (!pref.value)
          pref.value = true;
        break;
    }
  },

  /**
   * Update the privacy micro-management controls based on the
   * value of the private browsing auto-start preference.
   */
  updatePrivacyMicroControls() {
    // Set "Keep cookies until..." to "I close Nightly" and disable the setting
    // when we're in auto private mode (or reset it back otherwise).
    document.getElementById("keepCookiesUntil").value = this.readKeepCookiesUntil();

    let clearDataSettings = document.getElementById("clearDataSettings");

    if (document.getElementById("historyMode").value == "custom") {
      let disabled = Preferences.get("browser.privatebrowsing.autostart").value;
      this.dependentControls.forEach(function(aElement) {
        let control = document.getElementById(aElement);
        let preferenceId = control.getAttribute("preference");
        if (!preferenceId) {
          let dependentControlId = control.getAttribute("control");
          if (dependentControlId) {
            let dependentControl = document.getElementById(dependentControlId);
            preferenceId = dependentControl.getAttribute("preference");
          }
        }

        let preference = preferenceId ? Preferences.get(preferenceId) : {};
        control.disabled = disabled || preference.locked;
      });

      clearDataSettings.removeAttribute("hidden");

      // adjust the checked state of the sanitizeOnShutdown checkbox
      document.getElementById("alwaysClear").checked = disabled ? false :
        Preferences.get("privacy.sanitize.sanitizeOnShutdown").value;

      // adjust the checked state of the remember history checkboxes
      document.getElementById("rememberHistory").checked = disabled ? false :
        Preferences.get("places.history.enabled").value;
      document.getElementById("rememberForms").checked = disabled ? false :
        Preferences.get("browser.formfill.enable").value;

      if (!disabled) {
        // adjust the Settings button for sanitizeOnShutdown
        this._updateSanitizeSettingsButton();
      }
    } else {
      clearDataSettings.setAttribute("hidden", "true");
    }
  },

  // CLEAR PRIVATE DATA

  /*
   * Preferences:
   *
   * privacy.sanitize.sanitizeOnShutdown
   * - true if the user's private data is cleared on startup according to the
   *   Clear Private Data settings, false otherwise
   */

  /**
   * Displays the Clear Private Data settings dialog.
   */
  showClearPrivateDataSettings() {
    gSubDialog.open("chrome://browser/content/preferences/sanitize.xul", "resizable=no");
  },


  /**
   * Displays a dialog from which individual parts of private data may be
   * cleared.
   */
  clearPrivateDataNow(aClearEverything) {
    var ts = Preferences.get("privacy.sanitize.timeSpan");
    var timeSpanOrig = ts.value;

    if (aClearEverything) {
      ts.value = 0;
    }

    gSubDialog.open("chrome://browser/content/sanitize.xul", "resizable=no", null, () => {
      // reset the timeSpan pref
      if (aClearEverything) {
        ts.value = timeSpanOrig;
      }

      Services.obs.notifyObservers(null, "clear-private-data");
    });
  },

  /**
   * Enables or disables the "Settings..." button depending
   * on the privacy.sanitize.sanitizeOnShutdown preference value
   */
  _updateSanitizeSettingsButton() {
    var settingsButton = document.getElementById("clearDataSettings");
    var sanitizeOnShutdownPref = Preferences.get("privacy.sanitize.sanitizeOnShutdown");

    settingsButton.disabled = !sanitizeOnShutdownPref.value;
  },

  toggleDoNotDisturbNotifications(event) {
    AlertsServiceDND.manualDoNotDisturb = event.target.checked;
  },

  // PRIVATE BROWSING

  /**
   * Initialize the starting state for the auto-start private browsing mode pref reverter.
   */
  initAutoStartPrivateBrowsingReverter() {
    let mode = document.getElementById("historyMode");
    let autoStart = document.getElementById("privateBrowsingAutoStart");
    this._lastMode = mode.selectedIndex;
    this._lastCheckState = autoStart.hasAttribute("checked");
  },

  _lastMode: null,
  _lastCheckState: null,
  async updateAutostart() {
    let mode = document.getElementById("historyMode");
    let autoStart = document.getElementById("privateBrowsingAutoStart");
    let pref = Preferences.get("browser.privatebrowsing.autostart");
    if ((mode.value == "custom" && this._lastCheckState == autoStart.checked) ||
      (mode.value == "remember" && !this._lastCheckState) ||
      (mode.value == "dontremember" && this._lastCheckState)) {
      // These are all no-op changes, so we don't need to prompt.
      this._lastMode = mode.selectedIndex;
      this._lastCheckState = autoStart.hasAttribute("checked");
      return;
    }

    if (!this._shouldPromptForRestart) {
      // We're performing a revert. Just let it happen.
      return;
    }

    let buttonIndex = await confirmRestartPrompt(autoStart.checked, 1,
      true, false);
    if (buttonIndex == CONFIRM_RESTART_PROMPT_RESTART_NOW) {
      pref.value = autoStart.hasAttribute("checked");
      Services.startup.quit(Ci.nsIAppStartup.eAttemptQuit | Ci.nsIAppStartup.eRestart);
      return;
    }

    this._shouldPromptForRestart = false;

    if (this._lastCheckState) {
      autoStart.checked = "checked";
    } else {
      autoStart.removeAttribute("checked");
    }
    pref.value = autoStart.hasAttribute("checked");
    mode.selectedIndex = this._lastMode;
    mode.doCommand();

    this._shouldPromptForRestart = true;
  },

  /**
   * Displays fine-grained, per-site preferences for tracking protection.
   */
  showTrackingProtectionExceptions() {
    let params = {
      permissionType: "trackingprotection",
      hideStatusColumn: true,
    };
    gSubDialog.open("chrome://browser/content/preferences/permissions.xul",
      null, params);
  },

  /**
   * Displays the available block lists for tracking protection.
   */
  showBlockLists() {
    gSubDialog.open("chrome://browser/content/preferences/blocklists.xul", null);
  },

  // COOKIES AND SITE DATA

  /*
   * Preferences:
   *
   * network.cookie.cookieBehavior
   * - determines how the browser should handle cookies:
   *     0   means enable all cookies
   *     1   means reject all third party cookies
   *     2   means disable all cookies
   *     3   means reject third party cookies unless at least one is already set for the eTLD
   *         see netwerk/cookie/src/nsCookieService.cpp for details
   * network.cookie.lifetimePolicy
   * - determines how long cookies are stored:
   *     0   means keep cookies until they expire
   *     2   means keep cookies until the browser is closed
   */

  readKeepCookiesUntil() {
    let privateBrowsing = Preferences.get("browser.privatebrowsing.autostart").value;
    if (privateBrowsing) {
      return Ci.nsICookieService.ACCEPT_SESSION;
    }

    let lifetimePolicy = Preferences.get("network.cookie.lifetimePolicy").value;
    if (lifetimePolicy == Ci.nsICookieService.ACCEPT_SESSION) {
      return Ci.nsICookieService.ACCEPT_SESSION;
    }

    // network.cookie.lifetimePolicy can be set to any value, but we just
    // support ACCEPT_SESSION and ACCEPT_NORMALLY. Let's force ACCEPT_NORMALLY.
    return Ci.nsICookieService.ACCEPT_NORMALLY;
  },

  /**
   * Reads the network.cookie.cookieBehavior preference value and
   * enables/disables the rest of the new cookie & site data UI accordingly.
   *
   * Returns "allow" if cookies are accepted and "disallow" if they are entirely
   * disabled.
   */
  readBlockCookies() {
    // enable the rest of the UI for anything other than "accept all cookies"
    let pref = Preferences.get("network.cookie.cookieBehavior");
    let blockCookies = (pref.value != 0);

    // Our top-level setting is a radiogroup that only sets "enable all"
    // and "disable all", so convert the pref value accordingly.
    return blockCookies ? "disallow" : "allow";
  },

  /**
   * Updates the "accept third party cookies" menu based on whether the
   * "accept cookies" or "block cookies" radio buttons are selected.
   */
  writeBlockCookies() {
    let block = document.getElementById("blockCookies");
    let blockCookiesMenu = document.getElementById("blockCookiesMenu");

    // if we're disabling cookies, automatically select 'third-party trackers'
    if (block.value == "disallow") {
      blockCookiesMenu.selectedIndex = 0;
      return this.writeBlockCookiesFrom();
    }

    return Ci.nsICookieService.BEHAVIOR_ACCEPT;
  },

  enableThirdPartyCookiesUI() {
    document.getElementById("blockCookiesCBDeck").selectedIndex = 0;
    document.getElementById("contentBlockingChangeCookieSettings").hidden = true;

    let dependentControls = [
      ".reject-trackers-ui .content-blocking-checkbox",
      "#blockCookiesCB, #blockCookiesCB > radio",
      "#blockCookiesCBDeck",
    ];

    this._toggleControls(dependentControls, contentBlockingEnabled);
  },

  disableThirdPartyCookiesUI(reason) {
    let deckIndex = 0;
    switch (reason) {
      case "always":
        deckIndex = 1;
        break;
      case "unvisited":
        deckIndex = 2;
        break;
    }
    document.getElementById("blockCookiesCBDeck").selectedIndex = deckIndex;
    document.getElementById("contentBlockingChangeCookieSettings").hidden = false;

    let dependentControls = [
      ".reject-trackers-ui .content-blocking-checkbox",
      "#blockCookiesCB, #blockCookiesCB > radio",
      "#blockCookiesCBDeck",
    ];

    this._toggleControls(dependentControls, false);
  },

  /**
   * Converts between network.cookie.cookieBehavior and the new content blocking UI
   */
  readBlockCookiesCB() {
    let pref = Preferences.get("network.cookie.cookieBehavior");
    switch (pref.value) {
      case Ci.nsICookieService.BEHAVIOR_REJECT_FOREIGN:
        return "all-third-parties";
      case Ci.nsICookieService.BEHAVIOR_REJECT_TRACKER:
        return "trackers";
      default:
        return undefined;
    }
  },

  writeBlockCookiesCB() {
    let block = document.getElementById("blockCookiesCB").selectedItem;
    switch (block.value) {
      case "trackers":
        return Ci.nsICookieService.BEHAVIOR_REJECT_TRACKER;
      case "all-third-parties":
        return Ci.nsICookieService.BEHAVIOR_REJECT_FOREIGN;
      default:
        return undefined;
    }
  },

  writeBlockCookiesCheckbox() {
    let pref = Preferences.get("network.cookie.cookieBehavior");
    let bcCheckbox = document.getElementById("contentBlockingBlockCookiesCheckbox");
    let bcControl = document.getElementById("blockCookiesCB");

    let value;
    if (bcCheckbox.checked) {
      value = bcControl.selectedItem.value;
    } else {
      value = "none";
    }

    switch (value) {
      case "trackers":
      case "all-third-parties":
        bcControl.disabled = false;
        pref.value = this.writeBlockCookiesCB();
        break;
      default:
        bcControl.disabled = true;
        pref.value = Ci.nsICookieService.BEHAVIOR_ACCEPT;
        break;
    }
  },

  readBlockCookiesCheckbox() {
    let pref = Preferences.get("network.cookie.cookieBehavior");
    let bcCheckbox = document.getElementById("contentBlockingBlockCookiesCheckbox");
    let bcControl = document.getElementById("blockCookiesCB");

    switch (pref.value) {
      case Ci.nsICookieService.BEHAVIOR_ACCEPT:
        this.enableThirdPartyCookiesUI();
        bcCheckbox.checked = false;
        bcControl.disabled = true;
        break;
      case Ci.nsICookieService.BEHAVIOR_REJECT:
        this.disableThirdPartyCookiesUI("always");
        break;
      case Ci.nsICookieService.BEHAVIOR_LIMIT_FOREIGN:
        this.disableThirdPartyCookiesUI("unvisited");
        break;
      case Ci.nsICookieService.BEHAVIOR_REJECT_FOREIGN:
        this.enableThirdPartyCookiesUI();
        bcCheckbox.checked = true;
        bcControl.disabled = !contentBlockingEnabled;
        break;
      case Ci.nsICookieService.BEHAVIOR_REJECT_TRACKER:
        this.enableThirdPartyCookiesUI();
        bcCheckbox.checked = true;
        bcControl.disabled = !contentBlockingEnabled;
        break;
      default:
        break;
    }
  },

  /**
   * Converts between network.cookie.cookieBehavior and the new third-party cookies UI
   */
  readBlockCookiesFrom() {
    let pref = Preferences.get("network.cookie.cookieBehavior");
    switch (pref.value) {
      case Ci.nsICookieService.BEHAVIOR_REJECT_FOREIGN:
        return "all-third-parties";
      case Ci.nsICookieService.BEHAVIOR_REJECT:
        return "always";
      case Ci.nsICookieService.BEHAVIOR_LIMIT_FOREIGN:
        return "unvisited";
      case Ci.nsICookieService.BEHAVIOR_REJECT_TRACKER:
        return "trackers";
      default:
        return undefined;
    }
  },

  writeBlockCookiesFrom() {
    let block = document.getElementById("blockCookiesMenu").selectedItem;
    switch (block.value) {
      case "trackers":
        return Ci.nsICookieService.BEHAVIOR_REJECT_TRACKER;
      case "unvisited":
        return Ci.nsICookieService.BEHAVIOR_LIMIT_FOREIGN;
      case "always":
        return Ci.nsICookieService.BEHAVIOR_REJECT;
      case "all-third-parties":
        return Ci.nsICookieService.BEHAVIOR_REJECT_FOREIGN;
      default:
        return undefined;
    }
  },

  /**
   * Displays fine-grained, per-site preferences for cookies.
   */
  showCookieExceptions() {
    var params = {
      blockVisible: true,
      sessionVisible: true,
      allowVisible: true,
      prefilledHost: "",
      permissionType: "cookie",
    };
    gSubDialog.open("chrome://browser/content/preferences/permissions.xul",
      null, params);
  },

  showSiteDataSettings() {
    gSubDialog.open("chrome://browser/content/preferences/siteDataSettings.xul");
  },

  toggleSiteData(shouldShow) {
    let clearButton = document.getElementById("clearSiteDataButton");
    let settingsButton = document.getElementById("siteDataSettings");
    clearButton.disabled = !shouldShow;
    settingsButton.disabled = !shouldShow;
  },

  showSiteDataLoading() {
    let totalSiteDataSizeLabel = document.getElementById("totalSiteDataSize");
    document.l10n.setAttributes(totalSiteDataSizeLabel, "sitedata-total-size-calculating");
  },

  updateTotalDataSizeLabel(siteDataUsage) {
    SiteDataManager.getCacheSize().then(function(cacheUsage) {
      let totalSiteDataSizeLabel = document.getElementById("totalSiteDataSize");
      let totalUsage = siteDataUsage + cacheUsage;
      let [value, unit] = DownloadUtils.convertByteUnits(totalUsage);
      document.l10n.setAttributes(totalSiteDataSizeLabel, "sitedata-total-size", {
        value,
        unit,
      });
    });
  },

  clearSiteData() {
    gSubDialog.open("chrome://browser/content/preferences/clearSiteData.xul");
  },

  // GEOLOCATION

  /**
   * Displays the location exceptions dialog where specific site location
   * preferences can be set.
   */
  showLocationExceptions() {
    let params = { permissionType: "geo" };

    gSubDialog.open("chrome://browser/content/preferences/sitePermissions.xul",
      "resizable=yes", params);
  },

  // CAMERA

  /**
   * Displays the camera exceptions dialog where specific site camera
   * preferences can be set.
   */
  showCameraExceptions() {
    let params = { permissionType: "camera" };

    gSubDialog.open("chrome://browser/content/preferences/sitePermissions.xul",
      "resizable=yes", params);
  },

  // MICROPHONE

  /**
   * Displays the microphone exceptions dialog where specific site microphone
   * preferences can be set.
   */
  showMicrophoneExceptions() {
    let params = { permissionType: "microphone" };

    gSubDialog.open("chrome://browser/content/preferences/sitePermissions.xul",
      "resizable=yes", params);
  },

  // NOTIFICATIONS

  /**
   * Displays the notifications exceptions dialog where specific site notification
   * preferences can be set.
   */
  showNotificationExceptions() {
    let params = { permissionType: "desktop-notification" };

    gSubDialog.open("chrome://browser/content/preferences/sitePermissions.xul",
      "resizable=yes", params);

    try {
      Services.telemetry
        .getHistogramById("WEB_NOTIFICATION_EXCEPTIONS_OPENED").add();
    } catch (e) { }
  },


  // MEDIA

  initAutoplay() {
    let url = Services.urlFormatter.formatURLPref("app.support.baseURL") +
      "block-autoplay";
    document.getElementById("autoplayLearnMoreLink").setAttribute("href", url);
  },

  /**
   * The checkbox enabled sets the pref to BLOCKED
   */
  toggleAutoplayMedia(event) {
    let blocked = event.target.checked ? Ci.nsIAutoplay.BLOCKED : Ci.nsIAutoplay.ALLOWED;
    Services.prefs.setIntPref("media.autoplay.default", blocked);
  },

  /**
   * If user-gestures-needed is false we do not show any UI for configuring autoplay,
   * if user-gestures-needed is false and ask-permission is false we show a checkbox
   * which only allows the user to block autoplay
   * if user-gestures-needed and ask-permission are true we show a combobox that
   * allows the user to block / allow or prompt for autoplay
   * We will be performing a shield study to determine the behaviour to be
   * shipped, at which point we can remove these pref switches.
   * https://bugzilla.mozilla.org/show_bug.cgi?id=1475099
   */
  updateAutoplayMediaControlsVisibility() {
    let askPermission =
      Services.prefs.getBoolPref("media.autoplay.ask-permission", false);
    let userGestures =
        Services.prefs.getBoolPref("media.autoplay.enabled.user-gestures-needed", false);
    // Hide the combobox if we don't let the user ask for permission.
    document.getElementById("autoplayMediaComboboxWrapper").hidden =
      !userGestures || !askPermission;
    // If the user may ask for permission, hide the checkbox instead.
    document.getElementById("autoplayMediaCheckboxWrapper").hidden =
      !userGestures || askPermission;
  },

  /**
   * Displays the autoplay exceptions dialog where specific site autoplay preferences
   * can be set.
   */
  showAutoplayMediaExceptions() {
    var params = {
      blockVisible: true, sessionVisible: false, allowVisible: true,
      prefilledHost: "", permissionType: "autoplay-media",
    };

    gSubDialog.open("chrome://browser/content/preferences/permissions.xul",
      "resizable=yes", params);
  },

  // POP-UPS

  /**
   * Displays the popup exceptions dialog where specific site popup preferences
   * can be set.
   */
  showPopupExceptions() {
    var params = {
      blockVisible: false, sessionVisible: false, allowVisible: true,
      prefilledHost: "", permissionType: "popup",
    };

    gSubDialog.open("chrome://browser/content/preferences/permissions.xul",
      "resizable=yes", params);
  },

  // UTILITY FUNCTIONS

  /**
   * Utility function to enable/disable the button specified by aButtonID based
   * on the value of the Boolean preference specified by aPreferenceID.
   */
  updateButtons(aButtonID, aPreferenceID) {
    var button = document.getElementById(aButtonID);
    var preference = Preferences.get(aPreferenceID);
    button.disabled = !preference.value;
    return undefined;
  },

  // BEGIN UI CODE

  /*
   * Preferences:
   *
   * dom.disable_open_during_load
   * - true if popups are blocked by default, false otherwise
   */

  // POP-UPS

  /**
   * Displays a dialog in which the user can view and modify the list of sites
   * where passwords are never saved.
   */
  showPasswordExceptions() {
    var params = {
      blockVisible: true,
      sessionVisible: false,
      allowVisible: false,
      hideStatusColumn: true,
      prefilledHost: "",
      permissionType: "login-saving",
    };

    gSubDialog.open("chrome://browser/content/preferences/permissions.xul",
      null, params);
  },

  /**
   * Initializes master password UI: the "use master password" checkbox, selects
   * the master password button to show, and enables/disables it as necessary.
   * The master password is controlled by various bits of NSS functionality, so
   * the UI for it can't be controlled by the normal preference bindings.
   */
  _initMasterPasswordUI() {
    var noMP = !LoginHelper.isMasterPasswordSet();

    var button = document.getElementById("changeMasterPassword");
    button.disabled = noMP;

    var checkbox = document.getElementById("useMasterPassword");
    checkbox.checked = !noMP;
    checkbox.disabled = noMP && !Services.policies.isAllowed("createMasterPassword");
  },

  /**
   * Enables/disables the master password button depending on the state of the
   * "use master password" checkbox, and prompts for master password removal if
   * one is set.
   */
  updateMasterPasswordButton() {
    var checkbox = document.getElementById("useMasterPassword");
    var button = document.getElementById("changeMasterPassword");
    button.disabled = !checkbox.checked;

    // unchecking the checkbox should try to immediately remove the master
    // password, because it's impossible to non-destructively remove the master
    // password used to encrypt all the passwords without providing it (by
    // design), and it would be extremely odd to pop up that dialog when the
    // user closes the prefwindow and saves his settings
    if (!checkbox.checked)
      this._removeMasterPassword();
    else
      this.changeMasterPassword();

    this._initMasterPasswordUI();
  },

  /**
   * Displays the "remove master password" dialog to allow the user to remove
   * the current master password.  When the dialog is dismissed, master password
   * UI is automatically updated.
   */
  _removeMasterPassword() {
    var secmodDB = Cc["@mozilla.org/security/pkcs11moduledb;1"].
      getService(Ci.nsIPKCS11ModuleDB);
    if (secmodDB.isFIPSEnabled) {
      var bundle = document.getElementById("bundlePreferences");
      Services.prompt.alert(window,
        bundle.getString("pw_change_failed_title"),
        bundle.getString("pw_change2empty_in_fips_mode"));
      this._initMasterPasswordUI();
    } else {
      gSubDialog.open("chrome://mozapps/content/preferences/removemp.xul",
        null, null, this._initMasterPasswordUI.bind(this));
    }
  },

  /**
   * Displays a dialog in which the master password may be changed.
   */
  changeMasterPassword() {
    gSubDialog.open("chrome://mozapps/content/preferences/changemp.xul",
      "resizable=no", null, this._initMasterPasswordUI.bind(this));
  },

  /**
 * Shows the sites where the user has saved passwords and the associated login
 * information.
 */
  showPasswords() {
    gSubDialog.open("chrome://passwordmgr/content/passwordManager.xul");
  },

  /**
   * Enables/disables the Exceptions button used to configure sites where
   * passwords are never saved. When browser is set to start in Private
   * Browsing mode, the "Remember passwords" UI is useless, so we disable it.
   */
  readSavePasswords() {
    var pref = Preferences.get("signon.rememberSignons");
    var excepts = document.getElementById("passwordExceptions");

    if (PrivateBrowsingUtils.permanentPrivateBrowsing) {
      document.getElementById("savePasswords").disabled = true;
      excepts.disabled = true;
      return false;
    }
    excepts.disabled = !pref.value;
    // don't override pref value in UI
    return undefined;
  },

  /**
   * Enables/disables the add-ons Exceptions button depending on whether
   * or not add-on installation warnings are displayed.
   */
  readWarnAddonInstall() {
    var warn = Preferences.get("xpinstall.whitelist.required");
    var exceptions = document.getElementById("addonExceptions");

    exceptions.disabled = !warn.value;

    // don't override the preference value
    return undefined;
  },

  _initSafeBrowsing() {
    let enableSafeBrowsing = document.getElementById("enableSafeBrowsing");
    let blockDownloads = document.getElementById("blockDownloads");
    let blockUncommonUnwanted = document.getElementById("blockUncommonUnwanted");

    let safeBrowsingPhishingPref = Preferences.get("browser.safebrowsing.phishing.enabled");
    let safeBrowsingMalwarePref = Preferences.get("browser.safebrowsing.malware.enabled");

    let blockDownloadsPref = Preferences.get("browser.safebrowsing.downloads.enabled");
    let malwareTable = Preferences.get("urlclassifier.malwareTable");

    let blockUnwantedPref = Preferences.get("browser.safebrowsing.downloads.remote.block_potentially_unwanted");
    let blockUncommonPref = Preferences.get("browser.safebrowsing.downloads.remote.block_uncommon");

    let learnMoreLink = document.getElementById("enableSafeBrowsingLearnMore");
    let phishingUrl = Services.urlFormatter.formatURLPref("app.support.baseURL") + "phishing-malware";
    learnMoreLink.setAttribute("href", phishingUrl);

    enableSafeBrowsing.addEventListener("command", function() {
      safeBrowsingPhishingPref.value = enableSafeBrowsing.checked;
      safeBrowsingMalwarePref.value = enableSafeBrowsing.checked;

      if (enableSafeBrowsing.checked) {
        if (blockDownloads) {
          blockDownloads.removeAttribute("disabled");
          if (blockDownloads.checked) {
            blockUncommonUnwanted.removeAttribute("disabled");
          }
        } else {
          blockUncommonUnwanted.removeAttribute("disabled");
        }
      } else {
        if (blockDownloads) {
          blockDownloads.setAttribute("disabled", "true");
        }
        blockUncommonUnwanted.setAttribute("disabled", "true");
      }
    });

    if (blockDownloads) {
      blockDownloads.addEventListener("command", function() {
        blockDownloadsPref.value = blockDownloads.checked;
        if (blockDownloads.checked) {
          blockUncommonUnwanted.removeAttribute("disabled");
        } else {
          blockUncommonUnwanted.setAttribute("disabled", "true");
        }
      });
    }

    blockUncommonUnwanted.addEventListener("command", function() {
      blockUnwantedPref.value = blockUncommonUnwanted.checked;
      blockUncommonPref.value = blockUncommonUnwanted.checked;

      let malware = malwareTable.value
        .split(",")
        .filter(x => x !== "goog-unwanted-proto" &&
                     x !== "goog-unwanted-shavar" &&
                     x !== "test-unwanted-simple");

      if (blockUncommonUnwanted.checked) {
        if (malware.includes("goog-malware-shavar")) {
          malware.push("goog-unwanted-shavar");
        } else {
          malware.push("goog-unwanted-proto");
        }

        malware.push("test-unwanted-simple");
      }

      // sort alphabetically to keep the pref consistent
      malware.sort();

      malwareTable.value = malware.join(",");

      // Force an update after changing the malware table.
      let listmanager = Cc["@mozilla.org/url-classifier/listmanager;1"]
                        .getService(Ci.nsIUrlListManager);
      if (listmanager) {
        listmanager.forceUpdates(malwareTable.value);
      }
    });

    // set initial values

    // Librefox
    if (Services.prefs.prefIsLocked("browser.safebrowsing.downloads.enabled")) {
        enableSafeBrowsing.setAttribute("disabled", "true");
    }

    enableSafeBrowsing.checked = safeBrowsingPhishingPref.value && safeBrowsingMalwarePref.value;
    if (!enableSafeBrowsing.checked) {
      if (blockDownloads) {
        blockDownloads.setAttribute("disabled", "true");
      }

      blockUncommonUnwanted.setAttribute("disabled", "true");
    }

    if (blockDownloads) {
      blockDownloads.checked = blockDownloadsPref.value;
      if (!blockDownloadsPref.value) {
        blockUncommonUnwanted.setAttribute("disabled", "true");
      }
    }

    blockUncommonUnwanted.checked = blockUnwantedPref.value && blockUncommonPref.value;
  },

  /**
   * Displays the exceptions lists for add-on installation warnings.
   */
  showAddonExceptions() {
    var params = this._addonParams;

    gSubDialog.open("chrome://browser/content/preferences/permissions.xul",
      null, params);
  },

  /**
   * Parameters for the add-on install permissions dialog.
   */
  _addonParams:
  {
    blockVisible: false,
    sessionVisible: false,
    allowVisible: true,
    prefilledHost: "",
    permissionType: "install",
  },

  /**
   * readEnableOCSP is used by the preferences UI to determine whether or not
   * the checkbox for OCSP fetching should be checked (it returns true if it
   * should be checked and false otherwise). The about:config preference
   * "security.OCSP.enabled" is an integer rather than a boolean, so it can't be
   * directly mapped from {true,false} to {checked,unchecked}. The possible
   * values for "security.OCSP.enabled" are:
   * 0: fetching is disabled
   * 1: fetch for all certificates
   * 2: fetch only for EV certificates
   * Hence, if "security.OCSP.enabled" is non-zero, the checkbox should be
   * checked. Otherwise, it should be unchecked.
   */
  readEnableOCSP() {
    var preference = Preferences.get("security.OCSP.enabled");
    // This is the case if the preference is the default value.
    if (preference.value === undefined) {
      return true;
    }
    return preference.value != 0;
  },

  /**
   * writeEnableOCSP is used by the preferences UI to map the checked/unchecked
   * state of the OCSP fetching checkbox to the value that the preference
   * "security.OCSP.enabled" should be set to (it returns that value). See the
   * readEnableOCSP documentation for more background. We unfortunately don't
   * have enough information to map from {true,false} to all possible values for
   * "security.OCSP.enabled", but a reasonable alternative is to map from
   * {true,false} to {<the default value>,0}. That is, if the box is checked,
   * "security.OCSP.enabled" will be set to whatever default it should be, given
   * the platform and channel. If the box is unchecked, the preference will be
   * set to 0. Obviously this won't work if the default is 0, so we will have to
   * revisit this if we ever set it to 0.
   */
  writeEnableOCSP() {
    var checkbox = document.getElementById("enableOCSP");
    var defaults = Services.prefs.getDefaultBranch(null);
    var defaultValue = defaults.getIntPref("security.OCSP.enabled");
    return checkbox.checked ? defaultValue : 0;
  },

  /**
   * Displays the user's certificates and associated options.
   */
  showCertificates() {
    gSubDialog.open("chrome://pippki/content/certManager.xul");
  },

  /**
   * Displays a dialog from which the user can manage his security devices.
   */
  showSecurityDevices() {
    gSubDialog.open("chrome://pippki/content/device_manager.xul");
  },

  initDataCollection() {
    this._setupLearnMoreLink("toolkit.datacollection.infoURL",
      "dataCollectionPrivacyNotice");
  },

  initCollectBrowserErrors() {
    this._setupLearnMoreLink("browser.chrome.errorReporter.infoURL",
      "collectBrowserErrorsLearnMore");
  },

  initSubmitCrashes() {
    this._setupLearnMoreLink("toolkit.crashreporter.infoURL",
      "crashReporterLearnMore");
  },

  /**
   * Set up or hide the Learn More links for various data collection options
   */
  _setupLearnMoreLink(pref, element) {
    // set up the Learn More link with the correct URL
    let url = Services.urlFormatter.formatURLPref(pref);
    let el = document.getElementById(element);

    if (url) {
      el.setAttribute("href", url);
    } else {
      el.setAttribute("hidden", "true");
    }
  },

  /**
   * Initialize the health report service reference and checkbox.
   */
  initSubmitHealthReport() {
    this._setupLearnMoreLink("datareporting.healthreport.infoURL", "FHRLearnMore");

    let checkbox = document.getElementById("submitHealthReportBox");

    // Telemetry is only sending data if MOZ_TELEMETRY_REPORTING is defined.
    // We still want to display the preferences panel if that's not the case, but
    // we want it to be disabled and unchecked.
    if (Services.prefs.prefIsLocked(PREF_UPLOAD_ENABLED) ||
      !AppConstants.MOZ_TELEMETRY_REPORTING) {
      checkbox.setAttribute("disabled", "true");
      return;
    }

    checkbox.checked = Services.prefs.getBoolPref(PREF_UPLOAD_ENABLED) &&
      AppConstants.MOZ_TELEMETRY_REPORTING;
  },

  /**
   * Update the health report preference with state from checkbox.
   */
  updateSubmitHealthReport() {
    let checkbox = document.getElementById("submitHealthReportBox");
    Services.prefs.setBoolPref(PREF_UPLOAD_ENABLED, checkbox.checked);
  },


  /**
   * Initialize the opt-out-study preference checkbox into about:preferences and
   * handles events coming from the UI for it.
   */
  initOptOutStudyCheckbox(doc) {
    const allowedByPolicy = Services.policies.isAllowed("Shield");
    const checkbox = document.getElementById("optOutStudiesEnabled");

    function updateStudyCheckboxState() {
      // The checkbox should be disabled if any of the below are true. This
      // prevents the user from changing the value in the box.
      //
      // * the policy forbids shield
      // * the Shield Study preference is locked
      // * the FHR pref is false
      //
      // The checkbox should match the value of the preference only if all of
      // these are true. Otherwise, the checkbox should remain unchecked. This
      // is because in these situations, Shield studies are always disabled, and
      // so showing a checkbox would be confusing.
      //
      // * the policy allows Shield
      // * the FHR pref is true
      // * Normandy is enabled

      const checkboxMatchesPref = (
        allowedByPolicy &&
        Services.prefs.getBoolPref(PREF_UPLOAD_ENABLED, false) &&
        Services.prefs.getBoolPref(PREF_NORMANDY_ENABLED, false)
      );

      if (checkboxMatchesPref) {
        if (Services.prefs.getBoolPref(PREF_OPT_OUT_STUDIES_ENABLED, false)) {
          checkbox.setAttribute("checked", "checked");
        } else {
          checkbox.removeAttribute("checked");
        }
        checkbox.setAttribute("preference", PREF_OPT_OUT_STUDIES_ENABLED);
      } else {
        checkbox.removeAttribute("preference");
        checkbox.removeAttribute("checked");
      }

      const isDisabled = (
        !allowedByPolicy ||
        Services.prefs.prefIsLocked(PREF_OPT_OUT_STUDIES_ENABLED) ||
        !Services.prefs.getBoolPref(PREF_UPLOAD_ENABLED, false)
      );

      // We can't use checkbox.disabled here because the XBL binding may not be present,
      // in which case setting the property won't work properly.
      if (isDisabled) {
        checkbox.setAttribute("disabled", "true");
      } else {
        checkbox.removeAttribute("disabled");
      }
    }
    Preferences.get(PREF_UPLOAD_ENABLED).on("change", updateStudyCheckboxState);
    updateStudyCheckboxState();
  },

  observe(aSubject, aTopic, aData) {
    switch (aTopic) {
      case "sitedatamanager:updating-sites":
        // While updating, we want to disable this section and display loading message until updated
        this.toggleSiteData(false);
        this.showSiteDataLoading();
        break;

      case "sitedatamanager:sites-updated":
        this.toggleSiteData(true);
        SiteDataManager.getTotalUsage()
          .then(this.updateTotalDataSizeLabel.bind(this));
        break;
    }
  },

  // Accessibility checkbox helpers
  _initA11yState() {
    this._initA11yString();
    let checkbox = document.getElementById("a11yPrivacyCheckbox");
    switch (Services.prefs.getIntPref("accessibility.force_disabled")) {
      case 1: // access blocked
        checkbox.checked = true;
        break;
      case -1: // a11y is forced on for testing
      case 0: // access allowed
        checkbox.checked = false;
        break;
    }
  },

  _initA11yString() {
    let a11yLearnMoreLink =
      Services.urlFormatter.formatURLPref("accessibility.support.url");
    document.getElementById("a11yLearnMoreLink")
      .setAttribute("href", a11yLearnMoreLink);
  },

  async updateA11yPrefs(checked) {
    let buttonIndex = await confirmRestartPrompt(checked, 0, true, false);
    if (buttonIndex == CONFIRM_RESTART_PROMPT_RESTART_NOW) {
      Services.prefs.setIntPref("accessibility.force_disabled", checked ? 1 : 0);
      Services.telemetry.scalarSet("preferences.prevent_accessibility_services", true);
      Services.startup.quit(Ci.nsIAppStartup.eAttemptQuit | Ci.nsIAppStartup.eRestart);
    }

    // Revert the checkbox in case we didn't quit
    document.getElementById("a11yPrivacyCheckbox").checked = !checked;
  },
};
