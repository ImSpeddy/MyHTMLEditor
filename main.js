// Import libraries
const {
	app,
	BrowserWindow,
	ipcMain,
	dialog,
	webContents
} = require("electron");
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
	const window = launchWindow("./front/editor/editor.html", {
		width: 600,
		height: 600,
		minWidth: 600,
		minHeight: 400,
		webPreferences: { nodeIntegration: true, contextIsolation: false }
	});

	window.on("closed", () => {
		// TODO: Save editor state
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
		filters: [{ name: "HTML Files", extensions: ["html"] }]
	});
	var flag = true;
	if (openedDisplays.GETJSONDATA().length > 0) {
		openedDisplays.GETJSONDATA().forEach((e) => {
			if (e.fileLink == result.filePaths[0]) {
				flag = false;
			}
		});
	}
	if (!result.canceled && result.filePaths && result.filePaths[0] && flag) {
		const newWdwFMT = openedDisplays.FORMAT();

		newWdwFMT.SET("fileLink", result.filePaths[0]);
		newWdwFMT.SET(
			"window",
			launchWindow(result.filePaths[0], { width: 500, height: 500 })
		);

		openedDisplays.PUSH(newWdwFMT);

		openedDisplays
			.READ(
				openedDisplays.FINDQUICKINDEX("fileLink", result.filePaths[0]),
				"window"
			)
			.webContents.on("destroyed", () => {
				openedDisplays.DELETE(
					openedDisplays.FINDQUICKINDEX("fileLink", result.filePaths[0])
				);
			});
	}
});

ipcMain.handle("new-window-set", async (event, args) => {
	var flag = true;
	if (openedDisplays.GETJSONDATA().length > 0) {
		openedDisplays.GETJSONDATA().forEach((e) => {
			if (e.fileLink == args) {
				flag = false;
			}
		});
	}
	if (flag == false) return -1;
	const newWdwFMT = openedDisplays.FORMAT();

	newWdwFMT.SET("fileLink", args);
	newWdwFMT.SET("window", launchWindow(args, { width: 500, height: 500 }));

	openedDisplays.PUSH(newWdwFMT);

	openedDisplays
		.READ(openedDisplays.FINDQUICKINDEX("fileLink", args), "window")
		.webContents.on("destroyed", () => {
			openedDisplays.DELETE(openedDisplays.FINDQUICKINDEX("fileLink", args));
		});

	return openedDisplays.FINDQUICKINDEX("fileLink", args);
});

ipcMain.handle("filePickerDialog", async () => {
	const result = await dialog.showOpenDialog({
		properties: ["openFile"],
		filters: [
			{
				name: "Web development files",
				extensions: [
					"html",
					"htm",
					"mjs",
					"cjs",
					"jsx",
					"ts",
					"css",
					"js",
					"json",
					"tsx",
					"md",
					"txt",
					"php",
					"xml"
				]
			}
		]
	});
	return result.filePaths[0];
});

ipcMain.handle("get-dir", async () => {
	const result = await dialog.showOpenDialog({
		properties: ["openDirectory"]
	});

	if (result.canceled == false && result.filePaths.length == 1) {
		return { dir: result.filePaths, status: 0 };
	} else {
		return { dir: null, status: -1 };
	}
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
		(win) => win.webContents === event.sender
	);

	if (senderWindow) {
		senderWindow.close();
	}
});

ipcMain.on("forceCloseWindow", (event) => {
	const senderWindow = BrowserWindow.getAllWindows().find(
		(win) => win.webContents === event.sender
	);

	if (senderWindow) {
		senderWindow.destroy();
	}
});

ipcMain.on("printOnBackConsole", (event, args) => {
	console.log(args);
});

ipcMain.handle("pickOpenedDisplay", async () => {
	let openedDisplaysReduced = [];
	await openedDisplays.GETJSONDATA().forEach((e, i) => {
		openedDisplaysReduced.push({ fileLink: e.fileLink, window: i });
	});
	return openedDisplaysReduced;
});

ipcMain.on(
	"connectWindowSelection",
	(event, value, callerFile, CallerWindow) => {
		webContents
			.fromId(CallerWindow)
			.send("syncLinkedDisplay", callerFile, value);
	}
);

ipcMain.on("printOpenedDisplays", () => {
	// Function for debugging

	console.log(openedDisplays.GETJSONDATA());
});

ipcMain.on("restartDisplay", (event, args) => {
	openedDisplays
		.READ(args, "window")
		.loadFile(openedDisplays.READ(args, "fileLink"));
});
