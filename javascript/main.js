const consoleOutput = document.getElementById("console");

// Function to refresh the list of connected devices
async function refreshDevices() {
    try {
        const response = await fetch("/devices");
        const data = await response.json();

        const deviceDropdown = document.getElementById("deviceDropdown");
        deviceDropdown.innerHTML = ""; // Clear existing options

        if (data.devices.length > 0) {
            data.devices.forEach((device) => {
                const option = document.createElement("md-select-option");
                option.value = device.serial; // Use the device serial number as the value
                option.innerHTML = `<div slot="headline">${device.serial} (${device.state})</div>`;
                deviceDropdown.appendChild(option);
            });
            logToConsole("Devices refreshed successfully.", "info");
        } else {
            // Add default "No Devices Found" option
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

// Automatically load devices when the page loads
document.addEventListener("DOMContentLoaded", () => {
    refreshDevices(); // Call refreshDevices() to load devices on page load
});



// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {
    const rebootButton = document.getElementById("rebootButton");
    const rebootDropdown = document.getElementById("quickRebootDropdown");

    // Attach event listener to the reboot button
    rebootButton.addEventListener("click", () => {
        const selectedOption = rebootDropdown.value; // Get the selected value from the dropdown

        if (!selectedOption) {
            logToConsole("ERROR: No reboot option selected.", "error"); // Log an error if nothing is selected
            return;
        }

        // Call the existing reboot function
        reboot(selectedOption); // This should already exist in your JavaScript
    });
});

// Reboot the selected device into a specific mode
async function reboot(mode) {
    const device = document.getElementById("deviceDropdown").value; // Get selected device

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

rebootButton.addEventListener("click", () => {
    console.log("Reboot button clicked");
});

document.addEventListener("DOMContentLoaded", () => {
    const getPropButton = document.getElementById("getPropButton");
    const getPropDialog = document.getElementById("getPropDialog");
    const getPropOutput = document.getElementById("getPropOutput");
    const closePropDialog = document.getElementById("closePropDialog");

    // Add click event listener to the GetProp button
    getPropButton.addEventListener("click", async () => {
        const device = document.getElementById("deviceDropdown").value; // Get the selected device

        if (!device) {
            logToConsole("ERROR: No device selected.", "error");
            return;
        }

        try {
            // Fetch getprop data
            const response = await fetch("/getprop", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ device }),
            });

            const data = await response.json();

            if (data.output) {
                getPropOutput.textContent = data.output; // Set dialog content
                getPropDialog.show(); // Open the dialog
                logToConsole("Device properties fetched successfully.", "info");
            } else if (data.error) {
                logToConsole(`ERROR: ${data.error}`, "error");
            }
        } catch (error) {
            logToConsole(`ERROR: ${error.message}`, "error");
        }
    });

    // Close the dialog when the close button is clicked
    closePropDialog.addEventListener("click", () => {
        getPropDialog.close(); // Explicitly close the dialog
    });
});

async function fetchGetProp() {
  const device = document.getElementById("deviceDropdown").value;

  if (!device) {
    logToConsole("ERROR: No device selected.", "error");
    return;
  }

  try {
    const response = await fetch("/getprop", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ device }),
    });
    const data = await response.json();

    if (data.output) {
      logToConsole(`[GetProp Output]\n${data.output}`, "info");
    } else if (data.error) {
      logToConsole(`ERROR: ${data.error}`, "error");
    }
  } catch (error) {
    logToConsole(`ERROR: ${error.message}`, "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
    const pushAdbKeysButton = document.getElementById("pushAdbKeysButton");

    // Add click event listener to the Push ADB Keys button
    pushAdbKeysButton.addEventListener("click", () => {
        pushAdbKeys(); // Call the pushAdbKeys() function
    });
});

// Function to handle pushing ADB Keys
async function pushAdbKeys() {
    const device = document.getElementById("deviceDropdown").value; // Selected device
    const adbKeysPath = document.getElementById("adbKeysPath").value.trim(); // User-entered ADB keys path

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
            headers: {
                "Content-Type": "application/json",
            },
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

// Ensure the DOM is loaded before adding the event listener
document.addEventListener("DOMContentLoaded", () => {
    const installMagiskButton = document.getElementById("installMagiskButton");

    // Add click event listener to trigger Magisk installation
    installMagiskButton.addEventListener("click", () => {
        installMagisk(); // Call the existing installMagisk() function
    });
});

// Example installMagisk function
async function installMagisk() {
    const device = document.getElementById("deviceDropdown").value;

    if (!device) {
        logToConsole("ERROR: No device selected.", "error");
        return;
    }

    try {
        const response = await fetch("/install_magisk", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
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


// Clear the console output
function clearConsole() {
  consoleOutput.innerHTML = "";
  logToConsole("Console cleared.", "info");
}

// Fetch and display server logs
async function fetchLogs() {
  try {
    const response = await fetch("/logs");
    const logs = await response.text();
    logToConsole(`[Server Logs]\n${logs}`, "info");
  } catch (error) {
    logToConsole(`ERROR: Could not fetch logs. ${error.message}`, "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
    const consoleOutput = document.getElementById("consoleOutput");
    const logFile = document.getElementById("logFile");

    const clearConsoleButton = document.getElementById("clearConsoleButton");
    const clearLogButton = document.getElementById("clearLogButton");
    const fetchLogButton = document.getElementById("fetchLogButton");

    // Clear the console output
    clearConsoleButton.addEventListener("click", () => {
        consoleOutput.innerHTML = ""; // Clear the console output div
        logToConsole("Console cleared.", "info");
    });

    // Clear the log file display
    clearLogButton.addEventListener("click", () => {
        logFile.innerHTML = ""; // Clear the log file div
        logToConsole("Log file cleared.", "info");
    });

    // Fetch the log file from the backend
    fetchLogButton.addEventListener("click", async () => {
        try {
            const response = await fetch("/logs"); // Replace with your actual log file endpoint
            const logs = await response.text(); // Assume logs are returned as plain text
            logFile.textContent = logs; // Display logs in the log file section
            logToConsole("Log file fetched successfully.", "info");
        } catch (error) {
            logToConsole(`ERROR: Could not fetch logs. ${error.message}`, "error");
        }
    });

    // Utility function to log messages to the console output
    function logToConsole(message, type = "info") {
        const logEntry = document.createElement("p");
        logEntry.textContent = message;

        // Add styles based on the message type
        if (type === "error") {
            logEntry.style.color = "red";
        } else if (type === "info") {
            logEntry.style.color = "blue";
        } else {
            logEntry.style.color = "black";
        }

        consoleOutput.appendChild(logEntry); // Add log entry to the console output
        consoleOutput.scrollTop = consoleOutput.scrollHeight; // Auto-scroll to the bottom
    }
});

async function fetchVersion() {
  try {
    const response = await fetch("/version");
    const data = await response.json();
    document.getElementById(
      "versionText"
    ).textContent = `ADB Web Tool v${data.version} (Git SHA: ${data.git_sha})`;
  } catch (error) {
    console.error("Failed to fetch version:", error);
  }
}
