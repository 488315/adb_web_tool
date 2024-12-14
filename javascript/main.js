const consoleOutput = document.getElementById("console");

// Fetch connected devices and populate the dropdown
async function refreshDevices() {
  try {
    const response = await fetch("/devices");
    const data = await response.json();
    const dropdown = document.getElementById("deviceDropdown");
    dropdown.innerHTML = ""; // Clear existing options

    if (data.devices.length > 0) {
      data.devices.forEach((device) => {
        const option = document.createElement("option");
        option.value = device.serial;
        option.textContent = `${device.serial} (${device.state})`;
        dropdown.appendChild(option);
      });
      logToConsole("Devices refreshed successfully.", "info");
    } else {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "-- No Devices Found --";
      dropdown.appendChild(option);
      logToConsole("No devices found.", "error");
    }
  } catch (error) {
    logToConsole(`Failed to refresh devices: ${error.message}`, "error");
  }
}

// Reboot the selected device into a specific mode
async function reboot(mode) {
  const device = document.getElementById("deviceDropdown").value;

  if (!device) {
    logToConsole("ERROR: No device selected.", "error");
    return;
  }

  try {
    const response = await fetch(`/reboot/${mode}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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

// Push ADB keys after checking recovery mode and userdata mount
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
// Install the latest version of Magisk
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

// Log messages to the console
function logToConsole(message, type = "info") {
  const logEntry = document.createElement("p");
  logEntry.textContent = message;

  if (type === "error") {
    logEntry.classList.add("text-danger");
  } else if (type === "info") {
    logEntry.classList.add("text-info");
  } else {
    logEntry.classList.add("text-dark");
  }

  consoleOutput.appendChild(logEntry);
  consoleOutput.scrollTop = consoleOutput.scrollHeight; // Scroll to the bottom
}
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
