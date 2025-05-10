const path = require("path");

function getFileNameFromLink(file) {
	const parts = path.normalize(file).split(path.sep);
	return parts[parts.length - 1];
}

function getFileDirFromLink(file) {
	const parts = path.normalize(file).split(path.sep);
	let fileDir = "";

	parts.forEach((element, index, array) => {
		if (index !== array.length - 1) {
			if (index == 0) {
				fileDir = element;
			} else {
				fileDir = path.join(fileDir, element);
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
