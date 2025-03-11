const { ipcRenderer } = require("electron");
let CallerWindow = null;
let OpenedDisplays = null;
let CallerEditor = null;
let CallerFile = null;
ipcRenderer.on("loadOpenedEditors", (event, args) => {
	CallerWindow = args.callerWindowId;
	OpenedDisplays = args.openedDisplays;
	CallerEditor = args.callerWindowId;
	CallerFile = args.caller;
	OpenedDisplays.forEach((e) => {
		const option = document.createElement("option");
		option.value = e.window;
		const splittedFileLink = e.fileLink.split("\\");
		option.innerHTML = `${splittedFileLink[splittedFileLink.length - 2]}\\${splittedFileLink[splittedFileLink.length - 1]}`;
		document.getElementById("windowPicker").appendChild(option);
	});
});

document.getElementById("pickWindowBtn").addEventListener("click", () => {
	if (
		CallerWindow != null ||
		OpenedDisplays != null ||
		CallerEditor != null ||
		CallerFile != null
	) {
		if (document.getElementById("windowPicker").value != "none") {
			ipcRenderer.send(
				"connectWindowSelection",
				document.getElementById("windowPicker").value,
				CallerFile,
				CallerWindow
			);
		}
	} else {
		alert("Missing caller argument");
		console.log("Missing Caller Argument, variables are:");
		console.log(`CallerWindow: ${CallerWindow}`);
		console.log(`OpenedDisplays: ${OpenedDisplays}`);
		console.log(`CallerEditor: ${CallerEditor}`);
		console.log(`CallerFile: ${CallerFile}`);
	}
});
