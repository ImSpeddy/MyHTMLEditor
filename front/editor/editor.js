const { ipcRenderer } = require("electron");
const textArea = document.getElementById("TextArea");
const lineNumbers = document.getElementById("lineNumbers");
const {
	getFileDirFromLink,
	getFileDivIdFromLink,
	getFileNameFromLink
} = require("./modules/fileStringFunctions");
const highlighter = require("./highlight");

const fs = require("fs");

var fieldShown = false;
var isClosing = false;

// Setup needle table
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

const { getCaretPosition, setCaretPosition } = require("./modules/caret");

let currentFile = null;

// prettier-ignore
function printOnBackConsole(args) { // eslint-disable-line
	// Debug function
	ipcRenderer.send("printOnBackConsole", args);
}

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

async function openFile(file, callback) {
	if (OpenedFiles.FINDQUICKINDEX("fileLink", file) === -1) {
		const fileFMT = OpenedFiles.FORMAT();
		fileFMT.SET("fileLink", file);
		fileFMT.SET("fileName", getFileNameFromLink(file));
		fileFMT.SET("fileDir", getFileDirFromLink(file));
		fileFMT.SET("linkedDisplay", null);
		fileFMT.SET("fileDivId", getFileDivIdFromLink(file));
		fileFMT.SET("savedScroll", null);
		fileFMT.SET("savedCursor", null);

		newFileDiv(file);

		const fileData = await fs.readFileSync(file, { encoding: "utf-8" });
		fileFMT.SET("data", fileData);
		fileFMT.SET("savedFile", fileData);
		OpenedFiles.PUSH(fileFMT);

		if (typeof callback == "function") callback();
	} else {
		alert("File already opened");
	}
	checkField();
}

async function closeFile(file) {
	if (OpenedFiles.GETJSONDATA().length === 0 && isClosing) {
		ipcRenderer.send("closeWindow");
	}

	let savedData;
	savedData = await fs.readFileSync(file, { encoding: "utf-8" });

	if (
		OpenedFiles.READ(OpenedFiles.FINDQUICKINDEX("fileLink", file), "data") !==
		savedData
	) {
		const div = document.getElementById(getFileDivIdFromLink(file));
		const dialog = document.getElementById("saveDialog");
		dialog.showModal();

		const saveButton = document.getElementById("saveButtonDialog");
		const dontSaveButton = document.getElementById("notSaveButtonDialog");
		const cancelButton = document.getElementById("cancelSaveButtonDialog");

		cancelButton.addEventListener(
			"click",
			() => {
				dialog.close();
			},
			{ once: true }
		);

		dontSaveButton.addEventListener(
			"click",
			() => {
				OpenedFiles.DELETE(OpenedFiles.FINDQUICKINDEX("fileLink", file));
				div.remove();
				dialog.close();

				if (OpenedFiles.GETJSONDATA().length === 0) {
					unloadFiles();
					if (isClosing) {
						ipcRenderer.send("closeWindow");
					}
					return;
				} else {
					if (currentFile === file) {
						const nextFile = OpenedFiles.GETJSONDATA()[0].fileLink;
						loadFileIntoEditor(nextFile);
					}
				}
			},
			{ once: true }
		);

		saveButton.addEventListener(
			"click",
			() => {
				fs.writeFileSync(
					file,
					OpenedFiles.READ(
						OpenedFiles.FINDQUICKINDEX("fileLink", file),
						"data"
					),
					{ options: "utf-8" }
				);
				OpenedFiles.DELETE(OpenedFiles.FINDQUICKINDEX("fileLink", file));
				div.remove();
				dialog.close();

				if (OpenedFiles.GETJSONDATA().length === 0) {
					unloadFiles();
					if (isClosing) {
						ipcRenderer.send("closeWindow");
					}
					return;
				} else {
					if (currentFile === file) {
						const nextFile = OpenedFiles.GETJSONDATA()[0].fileLink;
						loadFileIntoEditor(nextFile);
					}
				}
			},
			{ once: true }
		);
	} else {
		OpenedFiles.DELETE(OpenedFiles.FINDQUICKINDEX("fileLink", file));

		const div = document.getElementById(getFileDivIdFromLink(file));
		div.remove();

		if (OpenedFiles.GETJSONDATA().length === 0) {
			unloadFiles();
			if (isClosing) {
				ipcRenderer.send("closeWindow");
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
		ipcRenderer.send("closeWindow");
	}
}

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
			closeFile(currentFile);
			if (OpenedFiles.GETJSONDATA().length === 0) {
				isClosing = true;
				ipcRenderer.send("closeWindow");
			}
		} else if (event.key.toLowerCase() === "w") {
			event.preventDefault();
			if (event.shiftKey) {
				if (
					currentFile === null ||
					(!currentFile.endsWith(".html") && !currentFile.endsWith(".htm"))
				) {
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

document.addEventListener("DOMContentLoaded", () => {
	checkField();
});

ipcRenderer.on("open-editor", (event, file) => {
	document.addEventListener("DOMContentLoaded", () => {
		openFile(file, () => {
			document
				.getElementById(getFileDivIdFromLink(file))
				.classList.add("curFileDiv");
			document
				.getElementById(getFileDivIdFromLink(file))
				.classList.remove("fileDiv");

			loadFileIntoEditor(file);
		});
		checkField();
	});
});

const saveButton = document.getElementById("SaveBtn");

function saveFile() {
	if (currentFile === null) return;
	fs.writeFileSync(
		currentFile,
		OpenedFiles.READ(
			OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
			"data"
		),
		{ options: "utf-8" }
	);
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
					textArea.innerText.replace(/\n/g, "\r\n")
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

		document.title = `${getFileNameFromLink(file)} - HTMLEditor`;
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
			const option = document.createElement("option");
			option.value = e.window;
			const splittedFileLink = e.fileLink.split("\\");
			option.innerHTML = `${splittedFileLink[splittedFileLink.length - 2]}\\${splittedFileLink[splittedFileLink.length - 1]}`;
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

window.addEventListener("beforeunload", (event) => {
	isClosing = true;
	if (OpenedFiles.GETJSONDATA().length > 0) {
		event.preventDefault();
		OpenedFiles.GETJSONDATA().forEach(async (e) => {
			await closeFile(e.fileLink);
		});
		ipcRenderer.send("closeWindow");
	} else {
		ipcRenderer.send("closeWindow");
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
	fieldShown = OpenedFiles.GETJSONDATA().length > 0 ? true : false;
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
	document.title = `HTMLEditor`;
	currentFile = null;
	textArea.innerText = "";
	updateLineNumbers();
	checkField();
}

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
		if (response.status == 0) {
			document.getElementById("fileDirLbl").innerHTML = response.dir;
			dir = response.dir;
		}
	});
});

/*
	const presetFiles = fs.readdirSync("./filePresets", { withFileTypes: true });
	let files = [];

	presetFiles.forEach((element) => {
		if (element.isFile()) {
			files.push(element);
		}
	});

	return files;
*/

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
		option.value = `${element.parentPath}\\${element.name}`;
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

createBtn.addEventListener("click", () => {
	const args = {
		name: document.getElementById("filenameField").value,
		dir: dir,
		preset: document.getElementById("presetPicker").value
	};

	if (args.dir == null || args.name == null || args.preset == null) {
		alert("Argument missing.");
	} else {
		ipcRenderer.invoke("createFile", args).then((response) => {
			if (response == 0) {
				openFile(`${args.dir}\\${args.name}`, () => {
					loadFileIntoEditor(`${args.dir}\\${args.name}`);
				});
				document.getElementById("filenameField").value = "";
				dir = null;
				document.getElementById("fileDirLbl").innerHTML = "No folder selected";
				document.getElementById("presetPicker").value = "none";
				document.getElementById("newFileDialog").close();
			} else {
				alert("Error in file creation");
			}
		});
	}
});

//////////////////////////////////////////////////////////
// Open Viewer
//////////////////////////////////////////////////////////

const openViewerBtn = document.getElementById("OpenViewerBtn");

openViewerBtn.addEventListener("click", (event) => {
	if (event.shiftKey) {
		if (
			currentFile === null ||
			(!currentFile.endsWith(".html") && !currentFile.endsWith(".htm"))
		) {
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
	if (document.getElementById("windowPicker").value != "none") {
		OpenedFiles.SET(
			OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
			"linkedDisplay",
			document.getElementById("windowPicker").value
		);
		pickOpenedDisplayDialog.close();
		document.getElementById("windowPicker").value = "none";
	}
});
