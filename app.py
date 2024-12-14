import os
import subprocess
import logging
from flask import Flask, request, jsonify, render_template
import platform
import ntpath

app = Flask(__name__)

# Determine ADB executable based on platform
ADB_COMMAND = "adb.exe" if platform.system() == "Windows" else "adb"

# Configure logging
logging.basicConfig(
    filename="adb_web_tool.log",
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

# Helper function to run ADB commands
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

@app.route("/")
def index():
    """Render the main page."""
    return render_template("index.html")

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
            # Include devices in recovery mode
            if state in {"device", "recovery"}:
                devices.append({"serial": serial, "state": state})

    logging.info(f"Connected devices: {devices}")
    return jsonify({"devices": devices})

@app.route("/check_userdata_and_push_keys", methods=["POST"])
def check_userdata_and_push_keys():
    data = request.json
    device = data.get("device")
    adb_keys_path = data.get("adb_keys_path")

    if not device:
        error_message = "Device is required."
        logging.warning(error_message)
        return jsonify({"error": error_message}), 400

    # Normalize path for cross-platform compatibility
    adb_keys_path = os.path.expanduser(adb_keys_path.strip())
    adb_keys_path = ntpath.normpath(adb_keys_path)  # Handle Windows-style paths

    if not os.path.isfile(adb_keys_path):
        error_message = f"File '{adb_keys_path}' not found or invalid."
        logging.warning(error_message)
        return jsonify({"error": error_message}), 400

    mount_output = run_adb_command(f"-s {device} shell mount")
    if "/data" not in mount_output:
        return jsonify({"error": "Userdata is not mounted in recovery mode."}), 400

    # Push adb_keys file
    push_command = f"-s {device} push {adb_keys_path} /data/misc/adb/adb_keys"
    push_output = run_adb_command(push_command)
    return jsonify({"output": push_output})

@app.route("/logs", methods=["GET"])
def fetch_logs():
    """Fetch and return the server logs."""
    log_file = "adb_web_tool.log"
    if not os.path.exists(log_file):
        return "Log file not found.", 404
    with open(log_file, "r") as f:
        return f.read()

@app.route("/execute", methods=["POST"])
def execute_command():
    """Execute an ADB command on a selected device."""
    data = request.json
    device = data.get("device")
    command = data.get("command")

    if not device or not command:
        error_message = "Device and command are required"
        logging.warning(error_message)
        return jsonify({"error": error_message}), 400

    # Run the command on the selected device
    full_command = f"-s {device} {command}"
    logging.info(f"Executing command on device {device}: {command}")
    output = run_adb_command(full_command)
    return jsonify({"output": output})

@app.route("/reboot/<mode>", methods=["POST"])
def reboot_device(mode):
    """Reboot the selected device into specific mode."""
    data = request.json
    device = data.get("device")

    if not device:
        error_message = "Device is required to reboot"
        logging.warning(error_message)
        return jsonify({"error": error_message}), 400

    valid_modes = {"recovery", "bootloader", "fastboot", "normal"}
    if mode not in valid_modes:
        error_message = f"Invalid reboot mode: {mode}"
        logging.warning(error_message)
        return jsonify({"error": error_message}), 400

    # Build the reboot command
    command = f"-s {device} reboot"
    if mode != "normal":  # Normal reboot doesn't need a mode argument
        command += f" {mode}"

    logging.info(f"Rebooting device {device} to {mode} mode.")
    output = run_adb_command(command)
    return jsonify({"output": output})

@app.route("/getprop", methods=["POST"])
def get_device_properties():
    """Fetch device properties using the 'getprop' command."""
    data = request.json
    device = data.get("device")

    if not device:
        error_message = "Device is required to fetch properties"
        logging.warning(error_message)
        return jsonify({"error": error_message}), 400

    # Execute the getprop command
    command = f"-s {device} shell getprop"
    logging.info(f"Fetching properties for device {device}")
    output = run_adb_command(command)
    return jsonify({"output": output})

if __name__ == "__main__":
    app.run(debug=True)
