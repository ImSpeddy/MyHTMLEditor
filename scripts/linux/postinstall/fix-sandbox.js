// scripts/linux/fix-sandbox.js
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");


module.exports = function () {
    if (process.platform === "linux") {
    // Correct path to node_modules/electron/dist/chrome-sandbox
    const sandboxPath = path.resolve(
        __dirname,
        "../../../node_modules/electron/dist/chrome-sandbox"
    );

    console.log("Fixing sandbox permissions... (sudo password may be required)");

    if (fs.existsSync(sandboxPath)) {
        try {
        execSync(`sudo chown root ${sandboxPath}`);
        execSync(`sudo chmod 4755 ${sandboxPath}`);
        console.log("✔ Sandbox permissions fixed.");
        } catch (err) {
        console.warn("⚠ Failed to fix sandbox permissions:", err.message);
        }
    } else {
        console.warn("⚠ Sandbox file not found at:", sandboxPath);
    }
    }
}