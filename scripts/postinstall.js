const fs = require("fs");
const path = require("path");
const os = require("os");

const { execSync } = require("child_process");

const platform = os.platform();
const arch = os.arch();

switch (platform) {
	case "darwin":
		// macOS specific code
		switch (arch) {
			case "x64": {
				const scripts = fs.readdirSync(
					path.join(__dirname, "darwin-x64", "postinstall")
				);
				scripts.forEach((script) => {
					if (script.endsWith(".js")) {
						require(
							path.join(__dirname, "darwin-x64", "postinstall", script)
						)();
					}
				});
				break;
			}
			case "arm64": {
				const scripts = fs.readdirSync(
					path.join(__dirname, "darwin-arm64", "postinstall")
				);
				scripts.forEach((script) => {
					if (script.endsWith(".js")) {
						require(
							path.join(__dirname, "darwin-arm64", "postinstall", script)
						)();
					}
				});
				break;
			}
			default:
				console.log("Are you still using PowerPC?");
		}
		break;
	case "linux": {
		const scripts = fs.readdirSync(
			path.join(__dirname, "linux", "postinstall")
		);
		scripts.forEach((script) => {
			if (script.endsWith(".js")) {
				require(path.join(__dirname, "linux", "postinstall", script))();
			} else if (script.endsWith(".sh")) {
				execSync(
					`chmod +x ${path.join(__dirname, "linux", "postinstall", script)}`
				);
				execSync(`${path.join(__dirname, "linux", "postinstall", script)}`);
			}
		});
		break;
	}
	case "win32": {
		const scripts = fs.readdirSync(
			path.join(__dirname, "win32", "postinstall")
		);
		scripts.forEach((script) => {
			if (script.endsWith(".js")) {
				require(path.join(__dirname, "win32", "postinstall", script))();
			} else if (script.endsWith(".bat")) {
				execSync(`${path.join(__dirname, "win32", "postinstall", script)}`);
			}
		});
		break;
	}
	default:
		console.error(`Unsupported platform: ${platform}`);
}
