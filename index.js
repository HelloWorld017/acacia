'use strict';
const {app, clipboard, dialog, ipcMain} = require('electron');
const fs = require('fs');
const path = require('path');
const request = require('request');
const {TextEncoder, TextDecoder} = require('text-encoding');
const translate = require('@k3rn31p4nic/google-translate-api');
const window = require('electron-window');

let readConfig = (path) => {
	return JSON.parse(fs.readFileSync(path));
};

let te = new TextEncoder('euc-kr', {NONSTANDARD_allowLegacyEncoding: true});
let td = new TextDecoder('shift-jis');

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
		toolbar: false,
		icon: path.join(__dirname, 'app', 'resources', 'images', 'acacia.ico')
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
		height: 600,
		icon: path.join(__dirname, 'app', 'resources', 'images', 'acacia.ico')
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

let configUpdate = (key, value) => {
	if(key === null || value === null) return;
	config[key] = value;
	fs.writeFileSync('./configurations/config.json', JSON.stringify(config, null, '\t'));
	if(mainWindow) mainWindow.webContents.send('update-config', key, value);
};

ipcMain.on('clickToggle', (ev, newClickable) => {
	if(newClickable === null) return;
	if(mainWindow) mainWindow.setIgnoreMouseEvents(newClickable);

	configUpdate('clickToggle', newClickable);
});

ipcMain.on('update-config', (ev, ...args) => {
	configUpdate(...args);
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
		if(config.buergToggle){
			rtext = td.decode(te.encode(rtext));
		}

		lastText = rtext;
		lastTime = Date.now();

		//let split = rtext.split(/(?:\r\n|\n|\r)/g);
		let split = rtext.split(/(\s|[＂（［｛‘“〔〈《「『【])/);
		let charaName = (split.length >= 3 && (config.fixedCharaToggle || charaDB[split[0]] !== undefined)) ? split.shift() : '';
		if(charaName !== ''){
			rtext = rtext.replace(charaName, '');
			charaName = charaDB[charaName] || charaName;
		}

		let text = rtext;

		charaDBKeys.forEach((k) => {
			text = text.split(k).join(charaDB[k]);
		});

		dictKeys.forEach((k) => {
			text = text.split(k).join(dict[k]);
		});

		translate(text, {from: config.translate_from, to: config.translate_to}).then((translation) => {
			if(mainWindow) mainWindow.webContents.send('clipboard-update', charaName, rtext, translation.text);
		});
	})();
	setTimeout(processUpdate, 100);
};
processUpdate();

request('https://raw.githubusercontent.com/HelloWorld017/acacia/master/package.json', (err, resp, body) => {
	if(JSON.parse(body).version !== require('./package').version){
		if(mainWindow) dialog.showMessageBox(mainWindow, {
			type: 'info',
			buttons: ['확인'],
			defaultId: 0,
			title: '업데이트가 사용 가능합니다.',
			message: '새로운 아카시아가 배포된 것을 확인했습니다.\nhttps://github.com/HelloWorld017/acacia/releases 에서 새 버젼을 다운받아주세요!\n업데이트 시 configurations 폴더를 옮기는 것을 잊지마세요!'
		});
	}
});
