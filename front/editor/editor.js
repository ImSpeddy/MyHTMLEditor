const { ipcRenderer } = require("electron");
const textArea = document.getElementById("TextArea");
const lineNumbers = document.getElementById("lineNumbers");
const {
	getFileDirFromLink,
	getFileDivIdFromLink,
	getFileNameFromLink
} = require("../../modules/fileStringFunctions");
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

let currentFile = null;

// TODO: Make a scrollbar on FileDivContainer for overflow

// prettier-ignore
function printOnBackConsole(args) { // eslint-disable-line
	// Debug function

	ipcRenderer.send("printOnBackConsole", args);
}

function newFileDiv(file) {
	const fileDiv = document.createElement("div");
	fileDiv.classList.add("fileDiv");
	fileDiv.id = getFileDivIdFromLink(file);

	fileDiv.addEventListener("click", () => {
		loadFileIntoEditor(file);
	});

	const fileDivText = document.createElement("p");
	fileDivText.classList.add("fileDivText");
	fileDivText.textContent = getFileNameFromLink(file);

	const fileDivBtn = document.createElement("button");
	fileDivBtn.classList.add("fileDivBtn");
	fileDivBtn.textContent = "X";

	fileDivBtn.addEventListener("click", () => {
		closeFile(file);
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

		newFileDiv(file);

		ipcRenderer.invoke("get-file-data", file).then((response) => {
			fileFMT.SET("data", response);
			OpenedFiles.PUSH(fileFMT);

			if (typeof callback == "function") callback();
		});
	} else {
		alert("File already opened");
	}
}

function closeFile(file) {
	// TODO: Handle case if file is not saved
	let savedData
	ipcRenderer.invoke("get-file-data", file).then((response) => {
		savedData = response;
	})

	if(OpenedFiles.READ(OpenedFiles.FINDQUICKINDEX("fileLink", file), "data") != savedData){
		alert("File not saved");
	}

	const div = document.getElementById(getFileDivIdFromLink(file));

	div.remove();
	OpenedFiles.DELETE(OpenedFiles.FINDQUICKINDEX("fileLink", file));

	if(OpenedFiles.GETJSONDATA().length == 0){
		ipcRenderer.send("closeWindow");
	}else{
		if(currentFile == file){
			const nextFile = OpenedFiles.GETJSONDATA()[0].fileLink;
			loadFileIntoEditor(nextFile);
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
	const selection = window.getSelection();
	let caretOffset = 0; // Store cursor position relative to text content

	if (selection.rangeCount > 0) {
		const range = selection.getRangeAt(0);
		const preCaretRange = range.cloneRange(); // Clone range for measurement
		preCaretRange.selectNodeContents(textArea);
		preCaretRange.setEnd(range.startContainer, range.startOffset);
		caretOffset = preCaretRange.toString().length; // Get offset in characters
	}

	const scrollPosition = textArea.scrollTop; // Preserve scroll position

	// Update content
	OpenedFiles.SET(
		OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
		"data",
		textArea.innerText
	);
	textArea.innerHTML = highlighter(textArea.innerText, currentFile);

	// Restore cursor position
	const newRange = document.createRange();
	const newSelection = window.getSelection();
	let charIndex = 0;
	let found = false;

	function setCaret(node) {
		if (node.nodeType === Node.TEXT_NODE) {
			const nextCharIndex = charIndex + node.length;
			if (!found && caretOffset >= charIndex && caretOffset <= nextCharIndex) {
				newRange.setStart(node, caretOffset - charIndex);
				newRange.setEnd(node, caretOffset - charIndex);
				found = true;
			}
			charIndex = nextCharIndex;
		} else {
			node.childNodes.forEach(setCaret);
		}
	}

	setCaret(textArea);

	newSelection.removeAllRanges();
	newSelection.addRange(newRange);
	textArea.scrollTop = scrollPosition; // Restore scroll position
});

textArea.addEventListener("keydown", (event) => {
	if (event.key === "Enter") {
		event.preventDefault();
		document.execCommand("insertLineBreak"); // Insert <br>
	}
	if (event.key === "Tab") {
		event.preventDefault();

		const start = textArea.selectionStart;

		const indent = "\t";

		document.execCommand("insertText", false, indent);

		textArea.selectionStart = textArea.selectionEnd = start + indent.length;
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

saveButton.addEventListener("click", () => {
	ipcRenderer.send(
		"save-file",
		currentFile,
		OpenedFiles.READ(
			OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
			"data"
		)
	);
});

function loadFileIntoEditor(file) {
	if(document.getElementById(getFileDivIdFromLink(file))){
		if (currentFile !== null) {
			const lastCurrentFile = currentFile;
			currentFile = file;

			if(document.getElementById(getFileDivIdFromLink(lastCurrentFile))){
				document
				.getElementById(getFileDivIdFromLink(lastCurrentFile))
				.classList.remove("curFileDiv");

				document
				.getElementById(getFileDivIdFromLink(lastCurrentFile))
				.classList.add("fileDiv");
			}
			
			document
				.getElementById(getFileDivIdFromLink(currentFile))
				.classList.add("curFileDiv");
			document
				.getElementById(getFileDivIdFromLink(currentFile))
				.classList.remove("fileDiv");
			
			if(document.getElementById(getFileDivIdFromLink(lastCurrentFile))){
				OpenedFiles.SET(
					OpenedFiles.FINDQUICKINDEX("fileLink", lastCurrentFile),
					"data",
					textArea.innerText
				);
			}

		}
		currentFile = file;
		textArea.innerText = OpenedFiles.READ(
			OpenedFiles.FINDQUICKINDEX("fileLink", currentFile),
			"data"
		);
		textArea.innerHTML = highlighter(textArea.innerText, currentFile);
		updateLineNumbers();

		document.title = `${getFileNameFromLink(file)} - HTMLEditor`;
	}
}

document.getElementById("openFile").addEventListener("click", () => {
	ipcRenderer.invoke("filePickerDialog").then((data) => {
		openFile(data, () => {
			loadFileIntoEditor(data);
		});
	});
});

document.getElementById("RefreshEditor").addEventListener("click", () => {
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
});

ipcRenderer.on("syncLinkedDisplay", (event, fileID, display) => {
	OpenedFiles.SET(fileID, "linkedDisplay", display);
});
