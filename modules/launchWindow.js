const { BrowserWindow } = require("electron");

module.exports = (file, windowOptions) => {
	if (typeof file !== "string") {
		throw new Error("Must pass filePath as a string");
	}

	const nWindow = new BrowserWindow(windowOptions);
	nWindow.loadFile(file);
	nWindow.show();
	return nWindow;
};
