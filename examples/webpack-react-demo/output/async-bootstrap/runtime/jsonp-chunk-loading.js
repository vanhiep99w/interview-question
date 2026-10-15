// Generated Webpack runtime, extracted from main.c3ab4e65c7a90e9407a4.js.map
// Source: webpack://webpack-react-demo/webpack/runtime/jsonp chunk loading
// This readable source-map module is not a separately emitted JS file.
// #region runtime
// no baseURI

// object to store loaded and loading chunks
// undefined = chunk not loaded, null = chunk preloaded/prefetched
// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
const installedChunks = {
	792: 0
};

__webpack_require__.f.j = (chunkId, promises) => {
		// JSONP chunk loading for javascript
		let installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
		if(installedChunkData !== 0) { // 0 means "already installed".

			// a Promise means "currently loading".
			if(installedChunkData) {
				promises.push(installedChunkData[2]);
			} else {
				if(true) { // all chunks have JS
					// setup Promise in chunk cache
					const promise = new Promise((resolve, reject) => (installedChunkData = installedChunks[chunkId] = [resolve, reject]));
					promises.push(installedChunkData[2] = promise);

					// create error before stack unwound to get useful stacktrace later
					const error = new Error();
					const loadingEnded = (event) => {
						if(__webpack_require__.o(installedChunks, chunkId)) {
							installedChunkData = installedChunks[chunkId];
							if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
							if(installedChunkData) {
								const errorType = event && (event.type === 'load' ? 'missing' : event.type);
								const realSrc = event && event.target && event.target.src;
								error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
								error.name = 'ChunkLoadError';
								error.type = errorType;
								error.request = realSrc;
								error.event = event;
								installedChunkData[1](error);
							}
						}
					};
					__webpack_require__.l(__webpack_require__.p + __webpack_require__.u(chunkId), loadingEnded, "chunk-" + chunkId, chunkId);
				}
			}
		}
};

// no prefetching

// no preloaded

// no HMR

// no HMR manifest

// no on chunks loaded

// install a JSONP callback for chunk loading
const webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
	let [chunkIds, moreModules, runtime] = data;
	// add "moreModules" to the modules object,
	// then flag all "chunkIds" as loaded and fire callback
	var moduleId, chunkId, i = 0;
	if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
		for(moduleId in moreModules) {
			if(__webpack_require__.o(moreModules, moduleId)) {
				__webpack_require__.m[moduleId] = moreModules[moduleId];
			}
		}
		if(runtime) var result = runtime(__webpack_require__);
	}
	if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
	for(;i < chunkIds.length; i++) {
		chunkId = chunkIds[i];
		if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
			installedChunks[chunkId][0]();
		}
		installedChunks[chunkId] = 0;
	}

}

const chunkLoadingGlobal = self["webpackChunkwebpack_react_demo"] = self["webpackChunkwebpack_react_demo"] || [];
chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
// #endregion runtime
