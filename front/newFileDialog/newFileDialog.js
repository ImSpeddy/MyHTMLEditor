const { ipcRenderer } = require("electron");

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

document.addEventListener("DOMContentLoaded", () => {
	const list = document.getElementById("presetPicker");
	ipcRenderer.invoke("get-preset-list").then((data) => {
		data.forEach((element) => {
			const option = document.createElement("option");
			option.value = `${element.parentPath}\\${element.name}`;
			option.innerHTML = element.name;

			list.appendChild(option);
		});
	});
});

const createBtn = document.getElementById("createFileBtnDiv");

createBtn.addEventListener("click", () => {
	const args = {
		name: document.getElementById("filenameField").value,
		dir: dir,
		preset: document.getElementById("presetPicker").value
	};

	if (args.dir == null || args.name == null || args.preset == null) {
		alert("Argument missing.");
		console.log("Error in file creation, null argument");
	} else {
		ipcRenderer.invoke("createFile", args).then((response) => {
			if (response == 0) {
				alert("File created successfully");
				ipcRenderer.send("closeWindow");
			} else {
				alert("Error in file creation");
				console.log(response);
			}
		});
	}
});
