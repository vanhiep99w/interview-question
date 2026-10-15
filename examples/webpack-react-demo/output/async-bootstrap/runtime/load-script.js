// Generated Webpack runtime, extracted from main.c3ab4e65c7a90e9407a4.js.map
// Source: webpack://webpack-react-demo/webpack/runtime/load script
// This readable source-map module is not a separately emitted JS file.
// #region runtime
const inProgress = {};
const dataWebpackPrefix = "webpack-react-demo:";
// loadScript function to load a script via script tag
__webpack_require__.l = (url, done, key, chunkId) => {
	if(inProgress[url]) { inProgress[url].push(done); return; }
	let script, needAttach;
	if(key !== undefined) {
		const scripts = document.getElementsByTagName("script");
		for(var i = 0; i < scripts.length; i++) {
			const s = scripts[i];
			if(s.getAttribute("src") == url || s.getAttribute("data-webpack") == dataWebpackPrefix + key) { script = s; break; }
		}
	}
	if(!script) {
		needAttach = true;
		script = document.createElement('script');

		script.charset = 'utf-8';
		if (__webpack_require__.nc) {
			script.setAttribute("nonce", __webpack_require__.nc);
		}
		script.setAttribute("data-webpack", dataWebpackPrefix + key);

		script.src = url;
	}
	inProgress[url] = [done];
	const onScriptComplete = (prev, event) => {
		// avoid mem leaks in IE.
		script.onerror = script.onload = null;
		clearTimeout(timeout);
		const doneFns = inProgress[url];
		delete inProgress[url];
		script.parentNode?.removeChild(script);
		doneFns?.forEach((fn) => (fn(event)));
		if(prev) return prev(event);
	}
	const timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), 120000);
	script.onerror = onScriptComplete.bind(null, script.onerror);
	script.onload = onScriptComplete.bind(null, script.onload);
	needAttach && document.head.appendChild(script);
};
// #endregion runtime
