const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');


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
		webPreferences: {
			nodeIntegration: true,
			preload: path.join(__dirname, './files/class/preload.js')
		},
	});

	// @Load file
	// mainWindow.webContents.openDevTools()
	mainWindow.loadFile(path.join(__dirname, 'files', 'index.html'));

	// @show window when file loaded
	mainWindow.webContents.once('dom-ready', () => {
		mainWindow.show();
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