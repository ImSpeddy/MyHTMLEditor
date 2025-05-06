/*
///////////////////////////////////////////////////////////////
		main.js / Index - Search with Ctrl + F (VSCode)
///////////////////////////////////////////////////////////////

	- Module Import
	- Setup Needle DB
	- Setup Main Editor
	- Handle New Window Creation
	- Handle file picking
	- Handle directory picking
	- Handle window closures
	- Close all displays
	- Handle Display Restart
	- Others

*/

///////////////////////////////////////////////////////////////
// Module Import
///////////////////////////////////////////////////////////////

const { app, BrowserWindow, ipcMain, dialog } = require("electron");

const launchWindow = require("./modules/launchWindow");

///////////////////////////////////////////////////////////////
// Setup Needle DB
///////////////////////////////////////////////////////////////

const needle = require("needle-db");
const openedDisplays = new needle();

openedDisplays.NEWCOLUMN("fileLink");
openedDisplays.NEWCOLUMN("window");

///////////////////////////////////////////////////////////////
// Setup Main Editor
///////////////////////////////////////////////////////////////
let mainWindow = null;
const createWindow = () => {
	mainWindow = launchWindow("./front/editor/editor.html", {
		width: 600,
		height: 600,
		minWidth: 600,
		minHeight: 400,
		webPreferences: { nodeIntegration: true, contextIsolation: false }
		//autoHideMenuBar: true // Commented out for debugging
	});

	mainWindow.on("closed", () => {
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

///////////////////////////////////////////////////////////////
// Handle New Window Creation
// - Handle set window creation
///////////////////////////////////////////////////////////////

function createNewDisplay(fileLink) {
	const newWdwFMT = openedDisplays.FORMAT();

	newWdwFMT.SET("fileLink", fileLink);
	newWdwFMT.SET(
		"window",
		launchWindow(fileLink, {
			width: 500,
			height: 500,
			webPreferences: { nodeIntegration: true }
		})
	);

	openedDisplays.PUSH(newWdwFMT);

	openedDisplays
		.READ(openedDisplays.FINDQUICKINDEX("fileLink", fileLink), "window")
		.webContents.on("destroyed", () => {
			openedDisplays.DELETE(
				openedDisplays.FINDQUICKINDEX("fileLink", fileLink)
			);
			if(!mainWindow.isDestroyed()){
				mainWindow.webContents.send("deleteWindow", fileLink);
			} else {
				app.quit()
			}
		});
}

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
		createNewDisplay(result.filePaths[0]);
	}
});

///////////////////////////////////////////////////////////////
// Handle New Window Creation: Handle set window creation
///////////////////////////////////////////////////////////////

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
	createNewDisplay(args);
	return args;
});

///////////////////////////////////////////////////////////////
// Handle file picking
///////////////////////////////////////////////////////////////

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

///////////////////////////////////////////////////////////////
// Handle directory picking
///////////////////////////////////////////////////////////////

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

///////////////////////////////////////////////////////////////
// Handle window closures
// - Force Close
///////////////////////////////////////////////////////////////

ipcMain.on("closeWindow", (event) => {
	const senderWindow = BrowserWindow.getAllWindows().find(
		(win) => win.webContents === event.sender
	);

	if (senderWindow) {
		senderWindow.close();
	}
});

///////////////////////////////////////////////////////////////
// Handle window closure: Force Close
///////////////////////////////////////////////////////////////

ipcMain.on("forceCloseWindow", (event) => {
	const senderWindow = BrowserWindow.getAllWindows().find(
		(win) => win.webContents === event.sender
	);

	if (senderWindow) {
		senderWindow.destroy();
	}
});

///////////////////////////////////////////////////////////////
// Close all displays
///////////////////////////////////////////////////////////////

ipcMain.on("closeAllDisplays", ()=>{
	openedDisplays.GETJSONDATA().forEach((e)=>{
		e.window.close();
	})
})

///////////////////////////////////////////////////////////////
// Handle Display Restart
///////////////////////////////////////////////////////////////

ipcMain.on("restartDisplay", (event, args) => {
	openedDisplays
		.READ(openedDisplays.FINDQUICKINDEX("fileLink", args), "window")
		.loadFile(
			openedDisplays.READ(
				openedDisplays.FINDQUICKINDEX("fileLink", args),
				"fileLink"
			)
		);
	openedDisplays
	.READ(openedDisplays.FINDQUICKINDEX("fileLink", args), "window").show()
});

///////////////////////////////////////////////////////////////
// Others
///////////////////////////////////////////////////////////////

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

ipcMain.on("printOpenedDisplays", () => {
	// Function for debugging

	console.log(openedDisplays.GETJSONDATA());
});
