const { ipcRenderer } = require("electron");
const textArea = document.getElementById("TextArea");
const lineNumbers = document.getElementById("lineNumbers");
const {
	getFileDirFromLink,
	getFileDivIdFromLink,
	getFileNameFromLink
} = require("./modules/fileStringFunctions");
const highlighter = require("./highlight");

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
OpenedFiles.NEWCOLUMN("savedFile")

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

		newFileDiv(file);

		ipcRenderer.invoke("get-file-data", file).then((response) => {
			fileFMT.SET("data", response);
			fileFMT.SET("savedFile", response);
			OpenedFiles.PUSH(fileFMT);

			if (typeof callback == "function") callback();
		});
	} else {
		alert("File already opened");
	}
}

async function closeFile(file) {
	let savedData;
	await ipcRenderer.invoke("get-file-data", file).then((response) => {
		savedData = response;
	});

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

		cancelButton.addEventListener("click", () => {
			dialog.close();
		});

		dontSaveButton.addEventListener("click", () => {
			OpenedFiles.DELETE(OpenedFiles.FINDQUICKINDEX("fileLink", file));
			div.remove();
			dialog.close();

			if (OpenedFiles.GETJSONDATA().length === 0) {
				return;
				// TODO: Show a "Not opened file text indicator and hide the text area"
				
			} else {
				if (currentFile === file) {
					const nextFile = OpenedFiles.GETJSONDATA()[0].fileLink;
					loadFileIntoEditor(nextFile);
				}
			}
		});

		saveButton.addEventListener("click", () => {
			ipcRenderer.send(
				"save-file",
				file,
				OpenedFiles.READ(OpenedFiles.FINDQUICKINDEX("fileLink", file), "data")
			);

			OpenedFiles.DELETE(OpenedFiles.FINDQUICKINDEX("fileLink", file));
			div.remove();
			dialog.close();

			if (OpenedFiles.GETJSONDATA().length === 0) {
				return;
				// TODO: Show a "Not opened file text indicator and hide the text area"
			} else {
				if (currentFile === file) {
					const nextFile = OpenedFiles.GETJSONDATA()[0].fileLink;
					loadFileIntoEditor(nextFile);
				}
			}
		});
	} else {
		OpenedFiles.DELETE(OpenedFiles.FINDQUICKINDEX("fileLink", file));

		const div = document.getElementById(getFileDivIdFromLink(file));
		div.remove();

		if (OpenedFiles.GETJSONDATA().length === 0) {
			return;
			// TODO: Show a "Not opened file text indicator and hide the text area"
		} else {
			if (currentFile === file) {
				const nextFile = OpenedFiles.GETJSONDATA()[0].fileLink;
				loadFileIntoEditor(nextFile);
			}
		}
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

	if(OpenedFiles.READ(OpenedFiles.FINDQUICKINDEX("fileLink", currentFile), "savedFile") !== textArea.innerText) {
		document.getElementById(getFileDivIdFromLink(currentFile) + "-lbl").classList.add("unsavedFile");
	} else {
		document.getElementById(getFileDivIdFromLink(currentFile) + "-lbl").classList.remove("unsavedFile");
	}
	textArea.innerHTML = highlighter(textArea.innerText, currentFile);

	// Restore cursor position
	setCaretPosition(caretOffset);
	textArea.scrollTop = scrollPosition; // Restore scroll position
});

textArea.addEventListener("keydown", (event) => {
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

	if(event.ctrlKey){
		if(event.key === "s"){
			event.preventDefault()
			saveFile();
		}else if(event.key === "n"){
			event.preventDefault()
			// TODO: Handle new file
		}else if(event.key === "r"){
			event.preventDefault()
			refreshEditor();
		}else if(event.key === "o"){
			event.preventDefault()
			openNewFile();
		}else if(event.key === "q"){
			event.preventDefault()
			closeFile(currentFile);
		}
	}

	if(event.altKey){
		console.log(event.key)
		const num = Number(event.key);
		if(!isNaN(num)){
			event.preventDefault();

			switch (num) {
				case 0:
					if(OpenedFiles.GETJSONDATA()[9]){
						loadFileIntoEditor(OpenedFiles.GETJSONDATA()[9].fileLink)
					}
					break;
				default:
					if(OpenedFiles.GETJSONDATA()[num-1]){
						loadFileIntoEditor(OpenedFiles.GETJSONDATA()[num-1].fileLink)
					}
					break;
			}
		}
	}
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
	});
});

const saveButton = document.getElementById("SaveBtn");

function saveFile(){
	ipcRenderer.send(
		"save-file",
		currentFile,
		OpenedFiles.READ(
			OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
			"data"
		)
	);
	OpenedFiles.SET(
		OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
		"savedFile",
		OpenedFiles.READ(
			OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
			"data"
		)
	);

	document.getElementById(getFileDivIdFromLink(currentFile) + "-lbl").classList.remove("unsavedFile");
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
		textArea.innerText = OpenedFiles.READ(
			OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
			"data"
		);
		textArea.innerHTML = highlighter(textArea.innerText, currentFile);

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
}

function openNewFile(){
	ipcRenderer.invoke("filePickerDialog").then((data) => {
		openFile(data, () => {
			loadFileIntoEditor(data);
		});
	});
}

document.getElementById("openFile").addEventListener("click", openNewFile);

function refreshEditor(){
	if (
		OpenedFiles.READ(
			OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
			"linkedDisplay"
		) == null
	) {
		ipcRenderer.invoke(
			"pickOpenedDisplay",
			OpenedFiles.FINDQUICKINDEX("fileLink", currentFile)
		);
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

document.getElementById("RefreshEditor").addEventListener("click", refreshEditor);

ipcRenderer.on("syncLinkedDisplay", (event, fileID, display) => {
	OpenedFiles.SET(fileID, "linkedDisplay", display);
});

window.addEventListener("beforeunload", (event) => {
	if (OpenedFiles.GETJSONDATA().length > 0) {
		event.preventDefault();
		OpenedFiles.GETJSONDATA().forEach((e) => {
			closeFile(e.fileLink);
		});
	}
});

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
