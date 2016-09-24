'use strict';
const {app, clipboard, ipcMain} = require('electron');
const fs = require('fs');
const path = require('path');
const translate = require('google-translate-api');
const window = require('electron-window');

let readConfig = (path) => {
	return JSON.parse(fs.readFileSync(path));
};

let config = readConfig('./configurations/config.json');
let dict = readConfig('./configurations/dictionary.json');
let dictKeys = Object.keys(dict);
let charaDB = readConfig('./configurations/characters.json');
let charaDBKeys = Object.keys(charaDB);

let mainWindow, prefWindow;

let createMainWindow = () => {
	const win = window.createWindow({
		width: 700,
		height: 200,
		alwaysOnTop: true,
		transparent: true,
		frame: false,
		toolbar: false
	});

	win.showUrl(path.join(__dirname, 'app', 'index.html'), config);
	win.on('closed', () => {
		app.quit();
		mainWindow = undefined;
	});

	return win;
};

let createPrefWindow = () => {
	const win = window.createWindow({
		width: 600,
		height: 600
	});

	win.setMenu(null);
	win.showUrl(path.join(__dirname, 'app', 'config.html'), config);
	win.on('closed', () => {
		prefWindow = undefined;
	});

	return win;
};

app.on('activate', () => {
	if(!mainWindow) mainWindow = createMainWindow();
	if(!prefWindow) prefWindow = createPrefWindow();
});

app.on('ready', () => {
	mainWindow = createMainWindow();
	prefWindow = createPrefWindow();
});

ipcMain.on('clickToggle', (ev, newClickable) => {
	if(newClickable === null) return;
	if(mainWindow) mainWindow.setIgnoreMouseEvents(newClickable);
});

ipcMain.on('update-config', (ev, key, value) => {
	if(key === null || value === null) return;
	config[key] = value;
	fs.writeFileSync('./configurations/config.json', JSON.stringify(config, null, '\t'));
	if(mainWindow) mainWindow.webContents.send('update-config', key, value);
});

let lastText = clipboard.readText();
let lastTime = 0;
let processUpdate = () => {
	(function(){
		let rtext = clipboard.readText();
		if(lastText === rtext) return;
		if(typeof rtext !== 'string') return;
		if(Date.now() - lastTime < 250) return;
		if(!mainWindow) return;

		lastText = rtext;
		lastTime = Date.now();

		//let split = rtext.split(/(?:\r\n|\n|\r)/g);
		let split = rtext.split(/(\s|[＂（［｛‘“〔〈《「『【])/);
		let charaName = (split.length >= 3 && charaDB[split[0]] !== undefined) ? split.shift() : '';
		let text = rtext;
		if(charaName !== ''){
			text = text.replace(charaName, '');
			charaName = charaDB[charaName];
		}

		charaDBKeys.forEach((k) => {
			text = text.split(k).join(charaDB[k]);
		});

		dictKeys.forEach((k) => {
			text = text.split(k).join(dict[k]);
		});

		translate(text, {from: 'ja', to: 'ko'}).then((translation) => {
			if(mainWindow) mainWindow.webContents.send('clipboard-update', charaName, text, translation.text);
		});
	})();
	setTimeout(processUpdate, 100);
};
processUpdate();
