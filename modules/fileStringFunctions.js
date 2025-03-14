function getFileNameFromLink(file) {
	return file.split("\\")[file.split("\\").length - 1];
}

function getFileDirFromLink(file) {
	let fileDir = "";

	file.split("\\").forEach((element, index, array) => {
		if (index !== array.length - 1) {
			if (index == 0) {
				fileDir = element;
			} else {
				fileDir = `${fileDir}\\${element}`;
			}
		}
	});

	return fileDir;
}

function getFileDivIdFromLink(file) {
	return `filediv-${file}`;
}

module.exports = {
	getFileDirFromLink,
	getFileDivIdFromLink,
	getFileNameFromLink
};
