// Imports

// Import Electron
const { ipcRenderer } = require("electron");

// Import tags from HTML
const ProjectChooseBtn = document.getElementById("ProjectChooseBtn");
const OpenEditorBtn = document.getElementById("OpenEditorBtn");
const NewFileBtn = document.getElementById("NewFileBtn");

// Import Files

// Main Code

document.addEventListener("DOMContentLoaded", () => {
	ProjectChooseBtn.onclick = () => {
		ipcRenderer.send("new-window");
	};

	OpenEditorBtn.onclick = () => {
		ipcRenderer.send("new-editor");
	};

	NewFileBtn.onclick = () => {
		ipcRenderer.send("new-file-wdw");
	};
});
