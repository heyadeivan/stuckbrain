/**
 * The preload script runs before. It has access to web APIs
 * as well as Electron's renderer process modules and some
 * polyfilled Node.js functions.
 * 
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */
// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener('DOMContentLoaded', () => {
  const minimizeBtn = document.getElementById('minimizeBtn')
  const ipc = ipcRenderer
  
  //MINIMIZE APP
  minimizeBtn.addEventListener('click', () => {
      ipc.send('minimizeApp')
  })

  maxResBtn.addEventListener('click', () => {
    ipc.send('maximizeRestoreApp')
  })

  ipc.on('isMaximized', () => { changeMaxResBtn(true) })
  ipc.on('isRestored', () => { changeMaxResBtn(false) })

  function changeMaxResBtn(isMaximizedApp) {
      if (isMaximizedApp) {
          var img = document.getElementById("maxRes");
          img.srcset = "icons/restore-w-10.png 1x, icons/restore-w-12.png 1.25x, icons/restore-w-15.png 1.5x, icons/restore-w-15.png 1.75x, icons/restore-w-20.png 2x, icons/restore-w-20.png 2.25x, icons/restore-w-24.png 2.5x, icons/restore-w-30.png 3x, icons/restore-w-30.png 3.5x";
      } else {
          var img = document.getElementById("maxRes");
          img.srcset = "icons/max-w-10.png 1x, icons/max-w-12.png 1.25x, icons/max-w-15.png 1.5x, icons/max-w-15.png 1.75x, icons/max-w-20.png 2x, icons/max-w-20.png 2.25x, icons/max-w-24.png 2.5x, icons/max-w-30.png 3x, icons/max-w-30.png 3.5x";
      }
  }

  //CLOSE APP
  closeBtn.addEventListener('click', () => {
      ipc.send('closeApp')
  })
})



const { shell, contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  startDrag: (fileName) => {
    ipcRenderer.send('ondragstart', fileName)
  }
})


//open links externally by default
document.addEventListener('click', function (event) {
  if (event.target.tagName === 'A' && event.target.href.startsWith('http')) {
    event.preventDefault()
    shell.openExternal(event.target.href)
  }
})


