const textArea = document.getElementById("TextArea");

module.exports.getCaretPosition = () => {
	const selection = window.getSelection();
	let caretOffset = 0; // Store cursor position relative to text content

	if (selection.rangeCount > 0) {
		const range = selection.getRangeAt(0);

		if (!textArea.contains(range.startContainer)) {
			return null;
		}

		const preCaretRange = range.cloneRange();
		preCaretRange.selectNodeContents(textArea);
		preCaretRange.setEnd(range.startContainer, range.startOffset);
		caretOffset = preCaretRange.toString().length; // Get offset in characters
	}

	return caretOffset;
};

module.exports.setCaretPosition = (offset) => {
	const range = document.createRange();
	const selection = window.getSelection();
	let charIndex = 0;
	let found = false;

	function traverseNodes(node) {
		if (node.nodeType === Node.TEXT_NODE) {
			const nextCharIndex = charIndex + node.length;
			if (!found && offset >= charIndex && offset <= nextCharIndex) {
				range.setStart(node, offset - charIndex);
				range.setEnd(node, offset - charIndex);
				found = true;
			}
			charIndex = nextCharIndex;
		} else {
			node.childNodes.forEach(traverseNodes);
		}
	}

	traverseNodes(textArea);
	selection.removeAllRanges();
	selection.addRange(range);
};
