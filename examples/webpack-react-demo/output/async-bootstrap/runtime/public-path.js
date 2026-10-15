// Generated Webpack runtime, extracted from main.c3ab4e65c7a90e9407a4.js.map
// Source: webpack://webpack-react-demo/webpack/runtime/publicPath
// This readable source-map module is not a separately emitted JS file.
// #region runtime
let scriptUrl;
if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
const document = __webpack_require__.g.document;
if (!scriptUrl && document) {
	if (document.currentScript?.tagName.toUpperCase() === 'SCRIPT')
		scriptUrl = document.currentScript.src;
	if (!scriptUrl) {
		const scripts = document.getElementsByTagName("script");
		if(scripts.length) {
			let i = scripts.length - 1;
			while (i > -1 && (!scriptUrl || !/^https?:/.test(scriptUrl))) scriptUrl = scripts[i--].src;
		}
	}
}
// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
scriptUrl = scriptUrl.replace(/^blob:|[?#].*$/g, "").replace(/\/[^/]+$/, "/");
__webpack_require__.p = scriptUrl;
// #endregion runtime
