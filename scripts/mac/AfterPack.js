const fs = require("fs-extra");
const path = require("path");
const archiver = require("archiver");

module.exports = async (context) => {
	const { appOutDir, packager } = context;
	const appName = packager.appInfo.productFilename;
	const version = packager.config.extraMetadata?.version || "0.0.0";
	const arch = process.arch;

	const customDirName = `webbox-${version}-mac-${arch}`;
	const customDirPath = path.resolve(appOutDir, "..", customDirName);

	await fs.remove(customDirPath);
	await fs.ensureDir(customDirPath);
	await fs.copy(
		path.join(appOutDir, `${appName}.app`),
		path.join(customDirPath, `${appName}.app`)
	);

	await fs.copy("filePresets", path.join(customDirPath, "filePresets"));
	await fs.copy("front/editor/highlighter.css", path.join(customDirPath, "front/editor/highlighter.css"));

	const zipPath = path.join(appOutDir, `webbox-${version}-mac-${arch}.zip`);
	const output = fs.createWriteStream(zipPath);
	const archive = archiver("zip", { zlib: { level: 9 } });

	return new Promise((resolve, reject) => {
		output.on("close", () => {
			console.log(`✅ Created zip at ${zipPath}`);
			resolve();
		});
		archive.on("error", reject);
		archive.pipe(output);
		archive.directory(customDirPath, false);
		archive.finalize();
	});
};
