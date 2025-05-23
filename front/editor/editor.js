/*
///////////////////////////////////////////////////////////////
		editor.js / Index - Search with Ctrl + F (VSCode)
///////////////////////////////////////////////////////////////

	- Module Import
	- Setup Needle DB
	- Control Variables
	- Creates new file div
	- Handle file opening
	- Handle file closing
	- Setup line numbers
	- Handle Enter and Tab keys
	- Handle Alt, Ctrl and Shift shortcuts
	- Handle Saving
	- Load file into editor
	- Refresh Editor
	- Handle App Closing
	- Save cursor position on blur
	- Hides field if no file is opened
	- New File Button
	- New File Dialog
	- Open Viewer
	- Pick Opened Display Dialog
	- Load Highlighter
	- Handle Window Deletion
	- Others

*/

///////////////////////////////////////////////////////////////
// Module Import
///////////////////////////////////////////////////////////////

const { ipcRenderer } = require("electron");
const textArea = document.getElementById("TextArea");
const lineNumbers = document.getElementById("lineNumbers");
const {
	getFileDirFromLink,
	getFileDivIdFromLink,
	getFileNameFromLink
} = require("./modules/fileStringFunctions");
const highlighter = require("./highlight");
const { getCaretPosition, setCaretPosition } = require("./modules/caret");
const fs = require("fs");
const path = require("path");

///////////////////////////////////////////////////////////////
// Setup Needle DB
///////////////////////////////////////////////////////////////

// Import Library
const needle = require("needle-db");

// Setup Table
let OpenedFiles = new needle();

// Setup Table Columns
OpenedFiles.NEWCOLUMN("fileLink"); // E:\\example\\example.js
OpenedFiles.NEWCOLUMN("fileName"); // example.js
OpenedFiles.NEWCOLUMN("fileDir"); // E:\\example
OpenedFiles.NEWCOLUMN("linkedDisplay");
OpenedFiles.NEWCOLUMN("data");
OpenedFiles.NEWCOLUMN("fileDivId");
OpenedFiles.NEWCOLUMN("savedScroll");
OpenedFiles.NEWCOLUMN("savedCursor");
OpenedFiles.NEWCOLUMN("savedFile");
OpenedFiles.NEWCOLUMN("usesCRLF");

///////////////////////////////////////////////////////////////
// Control Variables
///////////////////////////////////////////////////////////////

let fieldShown = false;
let isClosing = false;
let currentFile = null;

///////////////////////////////////////////////////////////////
// Creates new file div
///////////////////////////////////////////////////////////////

async function newFileDiv(file) {
	const fileDiv = document.createElement("div");
	fileDiv.classList.add("fileDiv");
	fileDiv.id = getFileDivIdFromLink(file);

	fileDiv.addEventListener("click", () => {
		loadFileIntoEditor(file);
	});

	const fileDivText = document.createElement("p");
	fileDivText.classList.add("fileDivText");
	fileDivText.textContent = getFileNameFromLink(file);
	fileDivText.id = getFileDivIdFromLink(file) + "-lbl";

	const fileDivBtn = document.createElement("button");
	fileDivBtn.classList.add("fileDivBtn");
	fileDivBtn.textContent = "X";

	fileDivBtn.addEventListener("click", async () => {
		await closeFile(file);
	});

	fileDiv.appendChild(fileDivText);
	fileDiv.appendChild(fileDivBtn);
	document.getElementById("FilePicker").appendChild(fileDiv);
}

///////////////////////////////////////////////////////////////
// Handle file opening
///////////////////////////////////////////////////////////////

function openFile(file, callback) {
	if (OpenedFiles.FINDQUICKINDEX("fileLink", file) === -1) {
		const fileFMT = OpenedFiles.FORMAT();
		fileFMT.SET("fileLink", file);
		fileFMT.SET("fileName", getFileNameFromLink(file));
		fileFMT.SET("fileDir", getFileDirFromLink(file));
		fileFMT.SET("linkedDisplay", null);
		fileFMT.SET("fileDivId", getFileDivIdFromLink(file));
		fileFMT.SET("savedScroll", null);
		fileFMT.SET("savedCursor", null);

		// noinspection JSIgnoredPromiseFromCall
		newFileDiv(file);

		const fileData = fs.readFileSync(file, { encoding: "utf-8" });
		const usesCRLF = /\r\n/.test(fileData);

		fileFMT.SET("usesCRLF", usesCRLF);

		fileFMT.SET("data", fileData);
		fileFMT.SET("savedFile", fileData);
		OpenedFiles.PUSH(fileFMT);

		if (typeof callback == "function") callback();
	} else {
		alert("File already opened");
	}
	checkField();
}

function openNewFile() {
	ipcRenderer.invoke("filePickerDialog").then((data) => {
		if (data) {
			openFile(data, () => {
				loadFileIntoEditor(data);
			});
		}
	});
}

document.getElementById("openFile").addEventListener("click", openNewFile);

///////////////////////////////////////////////////////////////
// Handle file closing
// - Create Save Dialog
///////////////////////////////////////////////////////////////

async function closeFile(file) {
	if (OpenedFiles.GETJSONDATA().length === 0 && isClosing) {
		ipcRenderer.send("closeWindow");
	}

	let savedData;
	savedData = fs.readFileSync(file, { encoding: "utf-8" });

	const data = OpenedFiles.READ(
		OpenedFiles.FINDQUICKINDEX("fileLink", file),
		"data"
	);

	const usesCRLF = OpenedFiles.READ(
		OpenedFiles.FINDQUICKINDEX("fileLink", file),
		"usesCRLF"
	);

	const normalized = usesCRLF
		? data.replace(/(?<!\r)\n/g, "\r\n")
		: data.replace(/\r\n/g, "\n");

	if (data !== savedData) {
		///////////////////////////////////////////////////////////////
		// Handle file closing: Create Save Dialog
		// - Create dialog elements
		// - Append children & Show dialog
		///////////////////////////////////////////////////////////////

		if (document.getElementById("saveDialog") === null) {
			const saveDialog = document.createElement("dialog");
			saveDialog.id = "saveDialog";
			const div = document.getElementById(getFileDivIdFromLink(file));

			///////////////////////////////////////////////////////////////
			// Handle file closing: Create Save Dialog: Create dialog elements
			///////////////////////////////////////////////////////////////
			const saveDialogText = document.createElement("p");
			saveDialogText.id = "saveDialogText";
			saveDialogText.innerHTML = "File is not saved";
			const saveButton = document.createElement("button");
			saveButton.id = "saveButtonDialog";
			saveButton.innerHTML = "Save";
			saveButton.addEventListener(
				"click",
				() => {
					fs.writeFileSync(file, normalized, { encoding: "utf-8" });
					closeFileClearDialogs(div, saveDialog, file);
				},
				{ once: true }
			);

			const dontSaveButton = document.createElement("button");
			dontSaveButton.id = "dontSaveButtonDialog";
			dontSaveButton.innerHTML = "Don't save";
			dontSaveButton.addEventListener(
				"click",
				() => {
					closeFileClearDialogs(div, saveDialog, file);
				},
				{ once: true }
			);

			function closeFileClearDialogs(div, saveDialog, file) {
				OpenedFiles.DELETE(OpenedFiles.FINDQUICKINDEX("fileLink", file));
				div.remove();
				saveDialog.remove();

				if (OpenedFiles.GETJSONDATA().length === 0) {
					unloadFiles();
					if (isClosing) {
						ipcRenderer.send("closeWindow");
					}
				} else {
					if (currentFile === file) {
						const nextFile = OpenedFiles.GETJSONDATA()[0].fileLink;
						loadFileIntoEditor(nextFile);
					}
				}
			}

			const cancelButton = document.createElement("button");
			cancelButton.id = "cancelSaveButtonDialog";
			cancelButton.innerHTML = "Cancel";
			cancelButton.addEventListener(
				"click",
				() => {
					saveDialog.remove();
				},
				{ once: true }
			);

			///////////////////////////////////////////////////////////////
			// Handle file closing: Create Save Dialog: Append children & Show dialog
			///////////////////////////////////////////////////////////////
			saveDialog.appendChild(saveDialogText);
			saveDialog.appendChild(saveButton);
			saveDialog.appendChild(dontSaveButton);
			saveDialog.appendChild(cancelButton);

			document.body.appendChild(saveDialog);
			saveDialog.showModal();
		} else {
			return;
		}
	} else {
		OpenedFiles.DELETE(OpenedFiles.FINDQUICKINDEX("fileLink", file));

		const div = document.getElementById(getFileDivIdFromLink(file));
		div.remove();

		if (OpenedFiles.GETJSONDATA().length === 0) {
			unloadFiles();
			if (isClosing) {
				ipcRenderer.send("forceCloseWindow");
			}
			return;
		} else {
			if (currentFile === file) {
				const nextFile = OpenedFiles.GETJSONDATA()[0].fileLink;
				loadFileIntoEditor(nextFile);
			}
		}
	}
	checkField();
	if (isClosing && OpenedFiles.GETJSONDATA().length === 0) {
		ipcRenderer.send("forceCloseWindow");
	}
}

///////////////////////////////////////////////////////////////
// Setup line numbers
///////////////////////////////////////////////////////////////

function updateLineNumbers() {
	const lines = textArea.innerText.split("\n").length;
	let lineNumberContent = "";
	for (let i = 1; i <= lines; i++) {
		lineNumberContent += i + "\n";
	}
	lineNumbers.textContent = lineNumberContent;
}

textArea.addEventListener("scroll", () => {
	lineNumbers.scrollTop = textArea.scrollTop;
});

textArea.addEventListener("input", () => {
	updateLineNumbers();
	const scrollPosition = textArea.scrollTop; // Preserve scroll position
	const caretOffset = getCaretPosition();

	// Update content
	OpenedFiles.SET(
		OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
		"data",
		textArea.innerText
	);

	if (
		OpenedFiles.READ(
			OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
			"savedFile"
		) !== textArea.innerText
	) {
		document
			.getElementById(getFileDivIdFromLink(currentFile) + "-lbl")
			.classList.add("unsavedFile");
	} else {
		document
			.getElementById(getFileDivIdFromLink(currentFile) + "-lbl")
			.classList.remove("unsavedFile");
	}
	textArea.innerHTML = highlighter(textArea.innerText, currentFile);

	// Restore cursor position
	setCaretPosition(caretOffset);
	textArea.scrollTop = scrollPosition; // Restore scroll position
});

///////////////////////////////////////////////////////////////
// Handle Enter and Tab keys
///////////////////////////////////////////////////////////////

textArea.addEventListener("keydown", async (event) => {
	if (event.key === "Enter") {
		event.preventDefault();
		document.execCommand("insertLineBreak");
	}
	if (event.key === "Tab") {
		event.preventDefault();
		const caretOffset = getCaretPosition();
		const indent = "\t";

		document.execCommand("insertText", false, indent);
		setCaretPosition(caretOffset + indent.length);
	}
});

///////////////////////////////////////////////////////////////
// Handle Alt, Ctrl and Shift shortcuts
///////////////////////////////////////////////////////////////

document.addEventListener("keydown", async (event) => {
	if (event.ctrlKey) {
		if (event.key === "s") {
			event.preventDefault();
			saveFile();
		} else if (event.key.toLowerCase() === "n") {
			event.preventDefault();
			document.getElementById("newFileDialog").showModal();
		} else if (event.key.toLowerCase() === "r") {
			event.preventDefault();
			await refreshEditor();
		} else if (event.key.toLowerCase() === "o") {
			event.preventDefault();
			openNewFile();
		} else if (event.key.toLowerCase() === "q") {
			event.preventDefault();
			await closeFile(currentFile);
			if (OpenedFiles.GETJSONDATA().length === 0) {
				isClosing = true;
				ipcRenderer.send("closeWindow");
			}
		} else if (event.key.toLowerCase() === "w") {
			event.preventDefault();
			// noinspection DuplicatedCode
			if (currentFile === null) return;
			if (event.shiftKey) {
				if (!currentFile.endsWith(".html") && !currentFile.endsWith(".htm")) {
					ipcRenderer.send("new-window");
				} else {
					ipcRenderer.invoke("new-window-set", currentFile).then((response) => {
						if (response !== -1) {
							OpenedFiles.SET(
								OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
								"linkedDisplay",
								response
							);
						}
					});
				}
			} else {
				ipcRenderer.send("new-window");
			}
		}
	}

	if (event.altKey) {
		const num = Number(event.key);
		if (!isNaN(num)) {
			event.preventDefault();

			switch (num) {
				case 0:
					if (OpenedFiles.GETJSONDATA()[9]) {
						loadFileIntoEditor(OpenedFiles.GETJSONDATA()[9].fileLink);
					}
					break;
				default:
					if (OpenedFiles.GETJSONDATA()[num - 1]) {
						loadFileIntoEditor(OpenedFiles.GETJSONDATA()[num - 1].fileLink);
					}
					break;
			}
		}
	}
});

///////////////////////////////////////////////////////////////
// Handle Saving
///////////////////////////////////////////////////////////////

const saveButton = document.getElementById("SaveBtn");

function saveFile() {
	if (currentFile === null) return;
	const data = OpenedFiles.READ(
		OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
		"data"
	);

	const usesCRLF = OpenedFiles.READ(
		OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
		"usesCRLF"
	);

	const normalized = usesCRLF
		? data.replace(/(?<!\r)\n/g, "\r\n")
		: data.replace(/\r\n/g, "\n");

	fs.writeFileSync(currentFile, normalized, { encoding: "utf-8" });
	OpenedFiles.SET(
		OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
		"savedFile",
		OpenedFiles.READ(
			OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
			"data"
		)
	);

	document
		.getElementById(getFileDivIdFromLink(currentFile) + "-lbl")
		.classList.remove("unsavedFile");
}

saveButton.addEventListener("click", saveFile);

///////////////////////////////////////////////////////////////
// Preserve scroll and cursor position on focus out
///////////////////////////////////////////////////////////////

textArea.addEventListener("focusout", () => {
	if (currentFile !== null) {
		// Save Caret Position
		const savedCursor = getCaretPosition();
		OpenedFiles.SET(
			OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
			"savedCursor",
			savedCursor
		);
		// Save Scroll Position
		const savedScroll = textArea.scrollTop;
		OpenedFiles.SET(
			OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
			"savedScroll",
			savedScroll
		);
	}
});

////////////////////////////////////////////////////////////////
// Load file into editor
////////////////////////////////////////////////////////////////

function loadFileIntoEditor(file) {
	textArea.focus();
	if (document.getElementById(getFileDivIdFromLink(file))) {
		if (currentFile !== null) {
			const lastCurrentFile = currentFile;
			currentFile = file;

			if (document.getElementById(getFileDivIdFromLink(lastCurrentFile))) {
				document
					.getElementById(getFileDivIdFromLink(lastCurrentFile))
					.classList.remove("curFileDiv");

				document
					.getElementById(getFileDivIdFromLink(lastCurrentFile))
					.classList.add("fileDiv");

				OpenedFiles.SET(
					OpenedFiles.FINDQUICKINDEX("fileLink", lastCurrentFile),
					"data",
					textArea.innerText
				);

				OpenedFiles.SET(
					OpenedFiles.FINDQUICKINDEX("fileLink", lastCurrentFile),
					"savedScroll",
					textArea.scrollTop
				);
			}

			document
				.getElementById(getFileDivIdFromLink(currentFile))
				.classList.add("curFileDiv");
			document
				.getElementById(getFileDivIdFromLink(currentFile))
				.classList.remove("fileDiv");
		}

		currentFile = file;

		const fileData = OpenedFiles.READ(
			OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
			"data"
		);

		textArea.innerHTML = highlighter(fileData, currentFile);

		const scroll = OpenedFiles.READ(
			OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
			"savedScroll"
		);

		const cursor = OpenedFiles.READ(
			OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
			"savedCursor"
		);

		if (scroll !== null) {
			textArea.scrollTop = scroll;
		}

		if (cursor !== null) {
			setCaretPosition(cursor);
		}

		updateLineNumbers();

		document.title = `${getFileNameFromLink(file)} - WebBox`;
	}
	checkField();
}

///////////////////////////////////////////////////////////////
// Refresh Editor
///////////////////////////////////////////////////////////////

async function refreshEditor() {
	if (currentFile === null) return;
	if (
		OpenedFiles.READ(
			OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
			"linkedDisplay"
		) == null
	) {
		let OpenedDisplays = [];

		await ipcRenderer.invoke("pickOpenedDisplay").then((response) => {
			OpenedDisplays = response;
		});

		OpenedDisplays.forEach((e) => {
			Array.from(document.getElementById("windowPicker").children).forEach(
				(child) => {
					child.remove();
				}
			);
			// <option value="none">(none)</option>
			const noOption = document.createElement("option");
			noOption.value = "none";
			noOption.innerHTML = "(none)";
			document.getElementById("windowPicker").appendChild(noOption);

			const option = document.createElement("option");
			option.value = e.fileLink;
			const splitFileLink = path.normalize(e.fileLink).split(path.sep);
			option.innerHTML = path.join(
				splitFileLink[splitFileLink.length - 2],
				splitFileLink[splitFileLink.length - 1]
			);
			document.getElementById("windowPicker").appendChild(option);
		});

		document.getElementById("pickOpenedDisplay").showModal();
	} else {
		ipcRenderer.send(
			"restartDisplay",
			OpenedFiles.READ(
				OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
				"linkedDisplay"
			)
		);
	}
}

document.getElementById("RefreshEditor").addEventListener("click", async () => {
	await refreshEditor();
});

ipcRenderer.on("syncLinkedDisplay", (event, fileID, display) => {
	OpenedFiles.SET(fileID, "linkedDisplay", display);
});

//////////////////////////////////////////////////////////////////
// Handle App Closing
//////////////////////////////////////////////////////////////////

window.addEventListener("beforeunload", async (event) => {
	ipcRenderer.send("closeAllDisplays");
	isClosing = true;
	if (OpenedFiles.GETJSONDATA().length > 0) {
		event.preventDefault();
		// noinspection ES6MissingAwait
		OpenedFiles.GETJSONDATA().forEach(async (e) => {
			await closeFile(e.fileLink);
		});
	} else {
		await ipcRenderer.send("forceCloseWindow");
	}
});

//////////////////////////////////////////////////////////////////
// Save cursor position on blur
//////////////////////////////////////////////////////////////////

window.addEventListener("focus", () => {
	if (currentFile) {
		textArea.focus();
		const savedCursor = OpenedFiles.READ(
			OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
			"savedCursor"
		);
		if (savedCursor !== null) {
			setCaretPosition(savedCursor);
		}
	}
});

window.addEventListener("blur", () => {
	if (currentFile && getCaretPosition() !== null) {
		OpenedFiles.SET(
			OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
			"savedCursor",
			getCaretPosition()
		);
	}
});

///////////////////////////////////////////////////////////////
// Hides field if no file is opened
///////////////////////////////////////////////////////////////

function checkField() {
	fieldShown = OpenedFiles.GETJSONDATA().length > 0;
	if (fieldShown) {
		document.getElementById("noOpenedFileContainer").style.display = "none";
		document.getElementById("noOpenedFileDialog").style.display = "none";
		document.getElementById("TextAreaContainer").style.display = "flex";
	} else {
		document.getElementById("noOpenedFileContainer").style.display = "flex";
		document.getElementById("noOpenedFileDialog").style.display = "block";
		document.getElementById("TextAreaContainer").style.display = "none";
	}
}

function unloadFiles() {
	document.title = `WebBox`;
	currentFile = null;
	textArea.innerText = "";
	updateLineNumbers();
	checkField();
}

document.addEventListener("DOMContentLoaded", () => {
	checkField();
});

//////////////////////////////////////////////////////////
// New File Button
//////////////////////////////////////////////////////////

document.getElementById("newFileBtn").addEventListener("click", () => {
	const dialog = document.getElementById("newFileDialog");
	if (dialog.open) {
		dialog.close();
	} else {
		dialog.showModal();
	}
});

//////////////////////////////////////////////////////////
// New File Dialog
//////////////////////////////////////////////////////////

const dirBtn = document.getElementById("PickFolderBtn");
let dir = null;

dirBtn.addEventListener("click", () => {
	ipcRenderer.invoke("get-dir").then((response) => {
		if (response.status === 0) {
			document.getElementById("fileDirLbl").innerHTML = response.dir;
			dir = response.dir;
		}
	});
});

document.addEventListener("DOMContentLoaded", () => {
	const list = document.getElementById("presetPicker");
	const presetFiles = fs.readdirSync("./filePresets", { withFileTypes: true });
	let files = [];

	presetFiles.forEach((element) => {
		if (element.isFile()) {
			files.push(element);
		}
	});
	files.forEach((element) => {
		const option = document.createElement("option");
		option.value = path.join(element.parentPath, element.name);
		option.innerHTML = element.name;

		list.appendChild(option);
	});
});

document
	.getElementById("cancelFileCreationBtn")
	.addEventListener("click", () => {
		const dialog = document.getElementById("newFileDialog");
		dialog.close();
		document.getElementById("filenameField").value = "";
		dir = null;
		document.getElementById("fileDirLbl").innerHTML = "No folder selected";
		document.getElementById("presetPicker").value = "none";
		document.getElementById("newFileDialog").close();
	});

const createBtn = document.getElementById("createFileBtn");

createBtn.addEventListener("click", async () => {
	const args = {
		name: document.getElementById("filenameField").value,
		dir: dir,
		preset: document.getElementById("presetPicker").value
	};

	if (args.dir == null || args.name == null || args.preset == null) {
		alert("Argument missing.");
	} else {
		let fileData = "";

		if (args.preset !== "none") {
			fileData = fs.readFileSync(args.preset, { encoding: "utf-8" });
		}

		fs.writeFileSync(path.join(args.dir, args.name), fileData);

		openFile(path.join(args.dir, args.name), () => {
			loadFileIntoEditor(path.join(args.dir, args.name));
		});
		document.getElementById("filenameField").value = "";
		dir = null;
		document.getElementById("fileDirLbl").innerHTML = "No folder selected";
		document.getElementById("presetPicker").value = "none";
		document.getElementById("newFileDialog").close();
	}
});

//////////////////////////////////////////////////////////
// Open Viewer
//////////////////////////////////////////////////////////

const openViewerBtn = document.getElementById("OpenViewerBtn");

openViewerBtn.addEventListener("click", (event) => {
	// noinspection DuplicatedCode
	if (currentFile === null) return;
	if (event.shiftKey) {
		if (!currentFile.endsWith(".html") && !currentFile.endsWith(".htm")) {
			ipcRenderer.send("new-window");
		} else {
			ipcRenderer.invoke("new-window-set", currentFile).then((response) => {
				if (response !== -1) {
					OpenedFiles.SET(
						OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
						"linkedDisplay",
						response
					);
				}
			});
		}
	} else {
		ipcRenderer.send("new-window");
	}
});

/////////////////////////////////////////////////////////
// Pick Opened Display Dialog
/////////////////////////////////////////////////////////

const pickOpenedDisplayDialog = document.getElementById("pickOpenedDisplay");
const cancelDisplayPickBtn = document.getElementById("cancelPickWindowBtn");

cancelDisplayPickBtn.addEventListener("click", () => {
	pickOpenedDisplayDialog.close();
	document.getElementById("windowPicker").value = "none";
});

const pickWindowBtn = document.getElementById("pickWindowBtn");

pickWindowBtn.addEventListener("click", () => {
	if (document.getElementById("windowPicker").value !== "none") {
		OpenedFiles.SET(
			OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
			"linkedDisplay",
			document.getElementById("windowPicker").value
		);
		pickOpenedDisplayDialog.close();
		document.getElementById("windowPicker").value = "none";
	} else {
		pickOpenedDisplayDialog.close();
	}
});

//////////////////////////////////////////////////////////
// Load Stylesheets
/////////////////////////////////////////////////////////

const HighlighterPath = path.join(
	process.cwd(),
	"front",
	"editor",
	"highlighter.css"
);
const EditorPath = path.join(process.cwd(), "front", "editor", "editor.css");

appendStylesheet(HighlighterPath);
appendStylesheet(EditorPath);

function appendStylesheet(dir) {
	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = `file://${dir}`;
	document.head.appendChild(link);
}

//////////////////////////////////////////////////////////
// Handle Window Deletion
/////////////////////////////////////////////////////////

ipcRenderer.on("deleteWindow", (event, fileLink) => {
	const linkedEditors = OpenedFiles.SEARCH("linkedDisplay", fileLink);

	linkedEditors.forEach((e) => {
		OpenedFiles.SET(e, "linkedDisplay", null);
	});
});

/////////////////////////////////////////////////////////
// Others
/////////////////////////////////////////////////////////

// prettier-ignore
// noinspection JSUnusedLocalSymbols
function printOnBackConsole(args) { // eslint-disable-line
	// Debug function
	ipcRenderer.send("printOnBackConsole", args);
}

document.addEventListener("DOMContentLoaded", () => {
	document.getElementById("versionIndicator").innerHTML =
		`WebBox v${require("../../package.json").version}`;
});
