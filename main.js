// Import libraries
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const fs = require("fs");
const needle = require("needle-db");

// Setup OpenedDisplaysDB

const openedDisplays = new needle();

openedDisplays.NEWCOLUMN("fileLink");
openedDisplays.NEWCOLUMN("window");

// Import Dependencies
const launchWindow = require("./modules/launchWindow");

// Setup Window
const createWindow = () => {
	const window = launchWindow("./front/index/index.html", {
		width: 350,
		height: 350,
		resizable: false,
		fullscreenable: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	window.on("closed", () => {
		app.quit();
	});
};

app.on("ready", createWindow);

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

ipcMain.on("new-window", async () => {
	const result = await dialog.showOpenDialog({
		properties: ["openFile"],
		filters: [{ name: "HTML Files", extensions: ["html"] }],
	});
	if (!result.canceled && result.filePaths && result.filePaths[0]) {
		const newWdwFMT = openedDisplays.FORMAT();

		newWdwFMT.SET("fileLink", result.filePaths[0]);
		newWdwFMT.SET(
			"window",
			launchWindow(result.filePaths[0], { width: 500, height: 500 }),
		);

		openedDisplays.PUSH(newWdwFMT);

		openedDisplays
			.READ(
				openedDisplays.FINDQUICKINDEX("fileLink", result.filePaths[0]),
				"window",
			)
			.webContents.on("destroyed", () => {
				// Handle window closed
			});
	}
});

ipcMain.on("new-editor", async () => {
	const result = await dialog.showOpenDialog({
		properties: ["openFile"],
		filters: [
			{
				name: "Web development files",
				extensions: ["html", "css", "js", "json"],
			},
		],
	});
	if (!result.canceled && result.filePaths && result.filePaths[0]) {
		let editWindow = launchWindow("./front/editor/editor.html", {
			width: 500,
			height: 500,
			webPreferences: { nodeIntegration: true, contextIsolation: false },
		});
		editWindow.webContents.send("open-editor", result.filePaths[0]);
	}
});

ipcMain.handle("get-file-data", (event, file) => {
	const filedata = fs.readFileSync(file, { encoding: "utf-8" });

	return filedata;
});

ipcMain.on("save-file", (event, file, data) => {
	fs.writeFileSync(file, data, { options: "utf-8" });
});

ipcMain.handle("filePickerDialog", async () => {
	const result = await dialog.showOpenDialog({
		properties: ["openFile"],
		filters: [
			{
				name: "Web development files",
				extensions: ["html", "css", "js", "json"],
			},
		],
	});
	return result.filePaths[0];
});

ipcMain.on("new-file-wdw", () => {
	launchWindow("./front/newFileDialog/newFileDialog.html", {
		width: 350,
		height: 350,
		resizable: true,
		fullscreenable: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});
});

ipcMain.handle("get-dir", async () => {
	const result = await dialog.showOpenDialog({
		properties: ["openDirectory"],
	});

	if (result.canceled == false && result.filePaths.length == 1) {
		return { dir: result.filePaths, status: 0 };
	} else {
		return { dir: null, status: -1 };
	}
});

ipcMain.handle("get-preset-list", () => {
	const presetFiles = fs.readdirSync("./filePresets", { withFileTypes: true });
	let files = [];

	presetFiles.forEach((element) => {
		if (element.isFile()) {
			files.push(element);
		}
	});

	return files;
});

ipcMain.handle("createFile", (event, args) => {
	let filedata = "";

	if (args.preset !== "none") {
		filedata = fs.readFileSync(args.preset, { encoding: "utf-8" });
	}

	let ans = 0;

	fs.writeFile(`${args.dir}\\${args.name}`, filedata, function (err) {
		if (err) {
			ans = err;
			throw err;
		}
	});

	return ans;
});

ipcMain.on("closeWindow", (event) => {
	const senderWindow = BrowserWindow.getAllWindows().find(
		(win) => win.webContents === event.sender,
	);

	if (senderWindow) {
		senderWindow.close();
	}
});

ipcMain.on("printOnBackConsole", (event, args) => {
	console.log(args);
});

ipcMain.handle("pickOpenedDisplay", (event, callerFileIndex) => {
	let dialog = launchWindow(
		"./front/pickOpenedDisplay/pickOpenedDisplay.html",
		{
			width: 450,
			height: 135,
			resizable: false,
			fullscreenable: false,
			webPreferences: { nodeIntegration: true, contextIsolation: false },
		},
	);
	let openedDisplaysReduced = [];
	openedDisplays.GETJSONDATA().forEach((e) => {
		openedDisplaysReduced.push({ fileLink: e.fileLink, window: e.window.id });
	});
	console.log(openedDisplaysReduced);
	dialog.webContents.send("loadOpenedEditors", {
		callerWindowId: event.sender.id,
		openedDisplays: openedDisplaysReduced,
		caller: callerFileIndex,
	});

	// Handling Idea: Send the editor who called the new display and the file looking to link to the dialog, so it can call the window itself and handle the file link
});

ipcMain.on("printOpenedDisplays", () => {
	// Function for debugging

	console.log(openedDisplays.GETJSONDATA());
});
