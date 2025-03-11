const { highlight } = require("highlight.js");

module.exports = (code, filename) => {
	if (filename.endsWith(".js") || filename.endsWith(".jsx")) {
		return highlight(code, { language: "javascript" }).value;
	} else if (filename.endsWith(".html") || filename.endsWith(".htm")) {
		return highlight(code, { language: "html" }).value;
	} else if (filename.endsWith(".css")) {
		return highlight(code, { language: "css" }).value;
	} else if (filename.endsWith(".json")){
		return highlight(code, { language: "json" }).value;
	}else if (filename.endsWith(".ts")){
		return highlight(code, { language: "typescript" }).value;
	} else {
		return code;
	}
};
