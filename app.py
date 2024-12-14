import os
import subprocess
import logging
from flask import Flask, request, jsonify, render_template, send_from_directory
import platform
import ntpath
import requests
import flask  # Import the Flask module to access its version
from importlib.metadata import version, PackageNotFoundError

# =============================================================================
# Configuration and Constants
# =============================================================================
APP_VERSION = "1.0.0"
MAGISK_LATEST_URL = "https://api.github.com/repos/topjohnwu/Magisk/releases/latest"
ADB_COMMAND = "adb.exe" if platform.system() == "Windows" else "adb"

# Configure logging
logging.basicConfig(
    filename="adb_web_tool.log",
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

# Initialize Flask app
app = Flask(__name__, static_folder='.')


# =============================================================================
# Utility Functions
# =============================================================================
def get_git_sha():
    """Retrieve the current Git short SHA."""
    try:
        git_command = ["git", "rev-parse", "--short", "HEAD"]
        sha = subprocess.check_output(git_command, stderr=subprocess.STDOUT, shell=(platform.system() == "Windows"))
        return sha.decode("utf-8").strip()
    except subprocess.CalledProcessError as e:
        logging.error(f"Failed to get Git SHA: {e.output.decode('utf-8')}")
        return "unknown"
    except FileNotFoundError:
        logging.error("Git command not found. Ensure Git is installed and in PATH.")
        return "git-not-found"

def get_latest_flask_version():
    """Fetch the latest Flask version from PyPI."""
    try:
        response = requests.get("https://pypi.org/pypi/Flask/json", timeout=5)
        response.raise_for_status()
        latest_version = response.json()["info"]["version"]
        return latest_version
    except requests.RequestException as e:
        return "unknown"

def get_current_flask_version():
    """Get the currently installed Flask version."""
    try:
        return version("flask")
    except PackageNotFoundError:
        return "unknown"
    
def get_adb_protocol_version():
    """Retrieve the ADB protocol version by running 'adb version'."""
    try:
        output = subprocess.check_output(
            ["adb", "version"],
            stderr=subprocess.STDOUT,
            shell=(platform.system() == "Windows")
        ).decode("utf-8").strip()

        for line in output.splitlines():
            if "Bridge version" in line:
                return line.split(":")[-1].strip()
        return "unknown"
    except FileNotFoundError:
        return "ADB not installed or not in PATH"  # Handle missing ADB
    except subprocess.CalledProcessError as e:
        return f"ADB command error: {e.output.decode('utf-8')}"  # Handle ADB command errors

def get_magisk_version():
    """Retrieve the latest Magisk version from GitHub."""
    try:
        response = requests.get(MAGISK_LATEST_URL, timeout=5)
        response.raise_for_status()
        latest_version = response.json()["tag_name"]  # Extract the version tag
        return latest_version
    except requests.RequestException:
        return "unknown"  # Handle network or API errors

def run_adb_command(command):
    """Run an ADB command and return the output."""
    full_command = [ADB_COMMAND] + command.split()
    logging.info(f"Executing ADB command: {' '.join(full_command)}")

    try:
        result = subprocess.run(
            full_command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True,
        )
        logging.info(f"Command output: {result.stdout.strip()}")
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        logging.error(f"Command failed: {e.stderr.strip()}")
        return e.stderr.strip()
    except FileNotFoundError as e:
        logging.error(f"ADB command not found: {e}")
        return "ADB command not found. Please ensure adb is installed and available in PATH."


def download_magisk_apk():
    """Download the latest Magisk APK from GitHub."""
    logging.info("Fetching the latest Magisk release information...")
    try:
        response = requests.get(MAGISK_LATEST_URL, timeout=10)
        response.raise_for_status()
        release_data = response.json()
        apk_url = next(
            (asset["browser_download_url"] for asset in release_data["assets"] if asset["name"].endswith(".apk")),
            None,
        )
        if not apk_url:
            logging.error("Magisk APK not found in the latest release.")
            return None, "Magisk APK not found."

        # Download the APK file
        logging.info(f"Downloading Magisk APK from {apk_url}...")
        apk_response = requests.get(apk_url, stream=True, timeout=15)
        apk_response.raise_for_status()

        # Save the APK locally
        apk_path = os.path.join(os.getcwd(), "Magisk-latest.apk")
        with open(apk_path, "wb") as apk_file:
            for chunk in apk_response.iter_content(chunk_size=8192):
                apk_file.write(chunk)

        logging.info(f"Magisk APK downloaded successfully: {apk_path}")
        return apk_path, None

    except requests.RequestException as e:
        logging.error(f"Failed to download Magisk APK: {e}")
        return None, str(e)


# =============================================================================
# Flask Routes
# =============================================================================

@app.route("/")
def index():
    """Render the main page."""
    return render_template("index.html")


@app.route("/javascript/<path:path>")
def serve_js(path):
    """Serve JavaScript files from the 'javascript' directory."""
    return send_from_directory('javascript', path)


@app.route("/version", methods=["GET"])
def get_version():
    """Return app version, Git SHA, Flask version comparison, ADB protocol version, and Magisk version."""
    current_flask_version = get_current_flask_version()
    latest_flask_version = get_latest_flask_version()
    adb_protocol_version = get_adb_protocol_version()
    magisk_version = get_magisk_version()

    return jsonify({
        "app_version": APP_VERSION,
        "git_sha": get_git_sha(),
        "current_flask_version": current_flask_version,
        "latest_flask_version": latest_flask_version,
        "is_flask_up_to_date": current_flask_version == latest_flask_version,
        "adb_protocol_version": adb_protocol_version,
        "magisk_version": magisk_version
    })


@app.route("/devices", methods=["GET"])
def get_devices():
    """Fetch connected ADB devices, including devices in recovery mode."""
    logging.info("Fetching connected devices...")
    output = run_adb_command("devices")
    devices = []

    for line in output.splitlines()[1:]:  # Skip the "List of devices attached" line
        parts = line.split("\t")
        if len(parts) == 2:
            serial, state = parts
            if state in {"device", "recovery"}:  # Include recovery mode devices
                devices.append({"serial": serial, "state": state})

    logging.info(f"Connected devices: {devices}")
    return jsonify({"devices": devices})


@app.route("/getprop", methods=["POST"])
def get_device_properties():
    """Fetch device properties using the 'getprop' command."""
    data = request.json
    device = data.get("device")

    if not device:
        logging.warning("Device is required to fetch properties.")
        return jsonify({"error": "Device is required to fetch properties"}), 400

    command = f"-s {device} shell getprop"
    logging.info(f"Fetching properties for device {device}")
    output = run_adb_command(command)
    return jsonify({"output": output})


@app.route("/check_userdata_and_push_keys", methods=["POST"])
def check_userdata_and_push_keys():
    """Check if userdata is mounted and push ADB keys."""
    data = request.json
    device = data.get("device")
    adb_keys_path = data.get("adb_keys_path")

    if not device:
        logging.warning("Device is required.")
        return jsonify({"error": "Device is required"}), 400

    adb_keys_path = os.path.expanduser(adb_keys_path.strip())
    adb_keys_path = ntpath.normpath(adb_keys_path)

    if not os.path.isfile(adb_keys_path):
        logging.warning(f"File '{adb_keys_path}' not found or invalid.")
        return jsonify({"error": f"File '{adb_keys_path}' not found or invalid."}), 400

    mount_output = run_adb_command(f"-s {device} shell mount")
    if "/data" not in mount_output:
        return jsonify({"error": "Userdata is not mounted in recovery mode."}), 400

    push_command = f"-s {device} push {adb_keys_path} /data/misc/adb/adb_keys"
    push_output = run_adb_command(push_command)
    return jsonify({"output": push_output})


@app.route("/install_magisk", methods=["POST"])
def install_magisk():
    """Install the latest version of Magisk to the selected device."""
    data = request.json
    device = data.get("device")

    if not device:
        logging.warning("Device is required.")
        return jsonify({"error": "Device is required"}), 400

    apk_path, error = download_magisk_apk()
    if error:
        return jsonify({"error": error}), 500

    install_command = f"-s {device} install {apk_path}"
    logging.info(f"Installing Magisk APK on device {device}...")
    install_output = run_adb_command(install_command)

    if "Success" in install_output:
        logging.info("Magisk installed successfully.")
        return jsonify({"output": "Magisk installed successfully."})
    else:
        logging.error(f"Magisk installation failed: {install_output}")
        return jsonify({"error": install_output}), 500


@app.route("/execute", methods=["POST"])
def execute_command():
    """Execute an ADB command on a selected device."""
    data = request.json
    device = data.get("device")
    command = data.get("command")

    if not device or not command:
        logging.warning("Device and command are required.")
        return jsonify({"error": "Device and command are required"}), 400

    full_command = f"-s {device} {command}"
    logging.info(f"Executing command on device {device}: {command}")
    output = run_adb_command(full_command)
    return jsonify({"output": output})


@app.route("/reboot/<mode>", methods=["POST"])
def reboot_device(mode):
    """Reboot the selected device into a specific mode."""
    data = request.json
    device = data.get("device")

    if not device:
        logging.warning("Device is required to reboot.")
        return jsonify({"error": "Device is required to reboot"}), 400

    valid_modes = {"recovery", "bootloader", "fastboot", "normal"}
    if mode not in valid_modes:
        logging.warning(f"Invalid reboot mode: {mode}")
        return jsonify({"error": f"Invalid reboot mode: {mode}"}), 400

    command = f"-s {device} reboot"
    if mode != "normal":
        command += f" {mode}"

    logging.info(f"Rebooting device {device} to {mode} mode.")
    output = run_adb_command(command)
    return jsonify({"output": output})


@app.route("/logs", methods=["GET"])
def fetch_logs():
    """Fetch and return the server logs."""
    log_file = "adb_web_tool.log"
    if not os.path.exists(log_file):
        return "Log file not found.", 404
    with open(log_file, "r") as f:
        return f.read()


# =============================================================================
# Main Entry Point
# =============================================================================
if __name__ == "__main__":
    app.run(debug=True)
