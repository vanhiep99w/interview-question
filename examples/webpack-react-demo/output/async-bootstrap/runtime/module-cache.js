// Generated Webpack runtime, extracted from main.c3ab4e65c7a90e9407a4.js.map
// Source: webpack://webpack-react-demo/webpack/bootstrap
// This readable source-map module is not a separately emitted JS file.
// #region runtime
// The module cache
const __webpack_module_cache__ = {};

// The require function
function __webpack_require__(moduleId) {
	// Check if module is in cache
	const cachedModule = __webpack_module_cache__[moduleId];
	if (cachedModule !== undefined) {
		return cachedModule.exports;
	}
	// Create a new module (and put it into the cache)
	const module = __webpack_module_cache__[moduleId] = {
		id: moduleId,
		// no module.loaded needed
		exports: {}
	};

	// Execute the module function
	__webpack_modules__[moduleId](module, module.exports, __webpack_require__);

	// Return the exports of the module
	return module.exports;
}

// expose the modules object (__webpack_modules__)
__webpack_require__.m = __webpack_modules__;
// #endregion runtime
