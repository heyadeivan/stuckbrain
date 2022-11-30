const { executeDwm, redraw } = require('./build/Release/micaElectron');

// # function to remove the frame of window
function removeFrame(window) {
	const HWND = window.getNativeWindowHandle()["readInt32LE"]();
	const bounds = window.getBounds();
	window.hide();
	redraw(HWND, bounds.x, bounds.y, bounds.width, bounds.height, 0x0020);
	window.show();
}
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// # Enable transparent
app.commandLine.appendSwitch("enable-transparent-visuals");

app.on('ready', () => {
    // @ Create a browserwindow
	const mainWindow = new BrowserWindow({
		width: 980,
		height: 740,
		minWidth: 980,
		minHeight: 740,
		frame: false,
		titlebarStyle: 'hidden',
		autoHideMenuBar: true,
		backgroundColor: '#000000ff', // Transparent background
		webPreferences: {
			nodeIntegration: true,
			preload: path.join(__dirname, './files/class/preload.js')
		},
	});

	// @ Get the HWND
	const HWND = mainWindow.getNativeWindowHandle()["readInt32LE"]();
	let params = 2;
	let value = 1;

	// @Load file
	// mainWindow.webContents.openDevTools()
	mainWindow.loadFile(path.join(__dirname, 'files', 'index.html'));

	// @show window when file loaded
	mainWindow.webContents.once('dom-ready', () => {
		mainWindow.show();
	});
    
	let hasFrame = false; // false to remvoe the window titlebar
	let frameRemoved = false;

	mainWindow.on('show', () => {
		if (!frameRemoved) {
			frameRemoved = true;
			if (!hasFrame) {
				removeFrame(mainWindow); // remove the frame when window is shown
				setInterval(() => executeDwm(HWND, params, value), 60); // refresh effect
			}
			// execute effect when window is shown
			executeDwm(HWND, params, value);
		}
	});

	// @ Minimize app
	ipcMain.on('minimizeApp', () => {
		//console.log('Clicked on minimizeBtn')
		mainWindow.minimize()
	})

	// @ Maximize Restore app
	ipcMain.on('maximizeRestoreApp', () => {
		if (mainWindow.isMaximized()) {
			//console.log('Clicked on maxResBtn and the window was restored')
			mainWindow.restore()
		} else {
			mainWindow.maximize()
			//console.log('Clicked on maxResBtn and the window was maximized')
		}
	})

	// @ Check if is maximized
	mainWindow.on('maximize', () => {
		mainWindow.webContents.send('isMaximized')
	})
	// @ Check if is restored
	mainWindow.on('unmaximize', () => {
		mainWindow.webContents.send('isRestored')
	})
	// @ Close app
	ipcMain.on('closeApp', () => {
        //console.log('Clicked on closeBtn')
        mainWindow.close()
	})

	const iconName = path.join(__dirname, './files/img/iconForDragAndDrop.png');
	ipcMain.on('ondragstart', (event, filePath) => {
		event.sender.startDrag({
			file: path.join(__dirname, filePath),
			icon: iconName,
		})
	})


});