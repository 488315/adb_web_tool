// =============================================================================
// Global Constants and DOM Elements
// =============================================================================

const consoleOutput = document.getElementById("consoleOutput");
const logFile = document.getElementById("logFile");

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Logs messages to the console output with optional color coding.
 * @param {string} message - The message to log.
 * @param {string} [type="info"] - The type of log (e.g., "info", "error").
 */
function logToConsole(message, type = "info") {
    const logEntry = document.createElement("p");
    logEntry.textContent = message;

    // Apply color coding based on the log type
    if (type === "error") {
        logEntry.style.color = "red";
    } else if (type === "info") {
        logEntry.style.color = "blue";
    } else {
        logEntry.style.color = "black";
    }

    consoleOutput.appendChild(logEntry);
    consoleOutput.scrollTop = consoleOutput.scrollHeight; // Auto-scroll to the bottom
}

// =============================================================================
// Initialization and Event Listeners
// =============================================================================

document.addEventListener("DOMContentLoaded", () => {
    // Load devices on page load
    refreshDevices();

    // Initialize buttons and event listeners
    initializeRebootButton();
    initializeGetPropButton();
    initializePushAdbKeysButton();
    initializeInstallMagiskButton();
    initializeConsoleControls();
    initializeVersionList();
});

// =============================================================================
// Device Management
// =============================================================================

/**
 * Refreshes the list of connected devices and updates the device dropdown.
 */
async function refreshDevices() {
    try {
        const response = await fetch("/devices");
        const data = await response.json();

        const deviceDropdown = document.getElementById("deviceDropdown");
        deviceDropdown.innerHTML = ""; // Clear existing options

        if (data.devices.length > 0) {
            data.devices.forEach((device) => {
                const option = document.createElement("md-select-option");
                option.value = device.serial;
                option.innerHTML = `<div slot="headline">${device.serial} (${device.state})</div>`;
                deviceDropdown.appendChild(option);
            });
            logToConsole("Devices refreshed successfully.", "info");
        } else {
            const noDevicesOption = document.createElement("md-select-option");
            noDevicesOption.value = "";
            noDevicesOption.innerHTML = `<div slot="headline">-- No Devices Found --</div>`;
            deviceDropdown.appendChild(noDevicesOption);
            logToConsole("No devices found.", "error");
        }
    } catch (error) {
        logToConsole(`Failed to refresh devices: ${error.message}`, "error");
    }
}

// =============================================================================
// Reboot Functionality
// =============================================================================

/**
 * Initializes the reboot button functionality.
 */
function initializeRebootButton() {
    const rebootButton = document.getElementById("rebootButton");
    const rebootDropdown = document.getElementById("quickRebootDropdown");

    rebootButton.addEventListener("click", () => {
        const selectedOption = rebootDropdown.value;

        if (!selectedOption) {
            logToConsole("ERROR: No reboot option selected.", "error");
            return;
        }

        reboot(selectedOption);
    });
}

/**
 * Reboots the selected device into the specified mode.
 * @param {string} mode - The reboot mode (e.g., "normal", "recovery").
 */
async function reboot(mode) {
    const device = document.getElementById("deviceDropdown").value;

    if (!device) {
        logToConsole("ERROR: No device selected.", "error");
        return;
    }

    try {
        const response = await fetch(`/reboot/${mode}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ device }),
        });

        const data = await response.json();

        if (data.output) {
            logToConsole(`Rebooting to ${mode}: ${data.output}`, "info");
        } else if (data.error) {
            logToConsole(`ERROR: ${data.error}`, "error");
        }
    } catch (error) {
        logToConsole(`ERROR: ${error.message}`, "error");
    }
}

// =============================================================================
// GetProp Functionality
// =============================================================================

/**
 * Initializes the GetProp button functionality.
 */
function initializeGetPropButton() {
    const getPropButton = document.getElementById("getPropButton");
    const getPropDialog = document.getElementById("getPropDialog");
    const getPropOutput = document.getElementById("getPropOutput");
    const closePropDialog = document.getElementById("closePropDialog");

    getPropButton.addEventListener("click", async () => {
        const device = document.getElementById("deviceDropdown").value;

        if (!device) {
            logToConsole("ERROR: No device selected.", "error");
            return;
        }

        try {
            const response = await fetch("/getprop", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ device }),
            });

            const data = await response.json();

            if (data.output) {
                getPropOutput.textContent = data.output;
                getPropDialog.show(); // Open the dialog
                logToConsole("Device properties fetched successfully.", "info");
            } else if (data.error) {
                logToConsole(`ERROR: ${data.error}`, "error");
            }
        } catch (error) {
            logToConsole(`ERROR: ${error.message}`, "error");
        }
    });

    closePropDialog.addEventListener("click", () => {
        getPropDialog.close();
    });
}

// =============================================================================
// ADB Keys Functionality
// =============================================================================

/**
 * Initializes the Push ADB Keys button functionality.
 */
function initializePushAdbKeysButton() {
    const pushAdbKeysButton = document.getElementById("pushAdbKeysButton");

    pushAdbKeysButton.addEventListener("click", () => {
        pushAdbKeys();
    });
}

/**
 * Pushes ADB keys to the selected device.
 */
async function pushAdbKeys() {
    const device = document.getElementById("deviceDropdown").value;
    const adbKeysPath = document.getElementById("adbKeysPath").value.trim();

    if (!device) {
        logToConsole("ERROR: No device selected.", "error");
        return;
    }

    if (!adbKeysPath) {
        logToConsole("ERROR: No ADB keys path provided.", "error");
        return;
    }

    try {
        const response = await fetch("/check_userdata_and_push_keys", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ device, adb_keys_path: adbKeysPath }),
        });

        const data = await response.json();

        if (data.output) {
            logToConsole(`ADB Keys pushed successfully:\n${data.output}`, "info");
        } else if (data.error) {
            logToConsole(`ERROR: ${data.error}`, "error");
        }
    } catch (error) {
        logToConsole(`ERROR: ${error.message}`, "error");
    }
}

// =============================================================================
// Magisk Installation
// =============================================================================

/**
 * Initializes the Install Magisk button functionality.
 */
function initializeInstallMagiskButton() {
    const installMagiskButton = document.getElementById("installMagiskButton");

    installMagiskButton.addEventListener("click", () => {
        installMagisk();
    });
}

/**
 * Installs the latest version of Magisk on the selected device.
 */
async function installMagisk() {
    const device = document.getElementById("deviceDropdown").value;

    if (!device) {
        logToConsole("ERROR: No device selected.", "error");
        return;
    }

    try {
        const response = await fetch("/install_magisk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ device }),
        });

        const data = await response.json();

        if (data.output) {
            logToConsole(`Magisk installed successfully:\n${data.output}`, "info");
        } else if (data.error) {
            logToConsole(`ERROR: ${data.error}`, "error");
        }
    } catch (error) {
        logToConsole(`ERROR: ${error.message}`, "error");
    }
}

// =============================================================================
// Console and Logs Management
// =============================================================================

/**
 * Initializes console and log controls.
 */
function initializeConsoleControls() {
    const clearConsoleButton = document.getElementById("clearConsoleButton");
    const clearLogButton = document.getElementById("clearLogButton");
    const fetchLogButton = document.getElementById("fetchLogButton");

    clearConsoleButton.addEventListener("click", () => {
        consoleOutput.innerHTML = "";
        logToConsole("Console cleared.", "info");
    });

    clearLogButton.addEventListener("click", () => {
        logFile.innerHTML = "";
        logToConsole("Log file cleared.", "info");
    });

    fetchLogButton.addEventListener("click", async () => {
        try {
            const response = await fetch("/logs");
            const logs = await response.text();
            logFile.textContent = logs;
            logToConsole("Log file fetched successfully.", "info");
        } catch (error) {
            logToConsole(`ERROR: Could not fetch logs. ${error.message}`, "error");
        }
    });
}

// =============================================================================
// Version List
// =============================================================================

/**
 * Initializes the version list display.
 */
async function initializeVersionList() {
    const versionList = document.getElementById("versionList");

    try {
        const response = await fetch("/version");
        const data = await response.json();

        const flaskStatus = data.is_flask_up_to_date
            ? "Up-to-date"
            : `Update Available: ${data.latest_flask_version}`;

        versionList.innerHTML = "";

        const versionInfo = [
            `App Version: v${data.app_version}`,
            `Git SHA: ${data.git_sha}`,
            `Flask Version: v${data.current_flask_version} (${flaskStatus})`,
            `ADB Protocol Version: ${data.adb_protocol_version}`,
            `Magisk Version: ${data.magisk_version}`
        ];

        versionInfo.forEach(info => {
            const listItem = document.createElement("li");
            listItem.textContent = info;
            versionList.appendChild(listItem);
        });
    } catch (error) {
        versionList.innerHTML = "";
        const errorItem = document.createElement("li");
        errorItem.textContent = "Failed to fetch version information.";
        versionList.appendChild(errorItem);
        console.error("Failed to fetch version information:", error);
    }
}
