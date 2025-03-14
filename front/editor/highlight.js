const { highlight } = require("highlight.js");

module.exports = (code, filename) => {
	if (filename.endsWith(".js") || filename.endsWith(".jsx") || filename.endsWith(".mjs") || filename.endsWith(".cjs")) {
		return highlight(code, { language: "javascript" }).value;
	} else if (filename.endsWith(".html") || filename.endsWith(".htm")) {
		return highlight(code, { language: "html" }).value;
	} else if (filename.endsWith(".css")) {
		return highlight(code, { language: "css" }).value;
	} else if (filename.endsWith(".json")) {
		return highlight(code, { language: "json" }).value;
	} else if (filename.endsWith(".ts") || filename.endsWith(".tsx")) {
		return highlight(code, { language: "typescript" }).value;
	} else if(filename.endsWith(".md")) {
		return highlight(code, { language: "markdown" }).value;
	} else if(filename.endsWith(".php")) {
		return highlight(code, { language: "php" }).value;
	} else if(filename.endsWith(".xml")) {
		return highlight(code, {language: "xml"}).value;
	}
	else{
		return code;
	}
};
