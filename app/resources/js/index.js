const {ipcRenderer} = require('electron');
const querystring = require('querystring');

const query = querystring.parse(location.search.replace(/^\?/, ''));
let config = JSON.parse(query['config']);
let watchers = {};

let elements = {
	chara: $('#chara'),
	original: $('#original'),
	script: $('#translation')
};

let updateConfig = (key, value) => {
	config[key] = value;
	(watchers[key] || (() => {}))(value);
};

let createCSSWatcher = (type, css, postfix) => {
	postfix = postfix || '';
	let isReplacer = typeof postfix === 'function';
	return (value) => {
		let updateObject = {};
		updateObject[css] = (isReplacer ? postfix(value) : value + postfix);
		elements[type].css(updateObject);
	}
};

['chara', 'script', 'original'].forEach((v) => {
	watchers[v + 'Border'] = createCSSWatcher(v, '-webkit-text-stroke-color');
	watchers[v + 'BorderSize'] = createCSSWatcher(v, '-webkit-text-stroke-width', 'px');
	watchers[v + 'Text'] = createCSSWatcher(v, 'color');
	watchers[v + 'Toggle'] = createCSSWatcher(v, 'display', (v) => {
		return v ? 'block' : 'none';
	});
	watchers[v + 'FontName'] = createCSSWatcher(v, 'font-family');
	watchers[v + 'FontSize'] = createCSSWatcher(v, 'font-size', 'pt');
});

Object.keys(config).forEach((k) => {
	(watchers[k] || (() => {}))(config[k]);
});

ipcRenderer.on('update-config', (ev, ...args) => {
	updateConfig(...args);
});

ipcRenderer.on('clipboard-update', (ev, chara, original, script) => {
	elements.chara.text(chara);
	elements.original.text(original);
	elements.script.text(script);
});
