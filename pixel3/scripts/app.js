import { Input, SizeInput, TextArea, Upload, Button } from './classes/input.js'
import { NavWindow } from './classes/nav.js'
import TraceSvg from './classes/traceSvg.js'
import { settings, elements } from './elements.js'
import { mouse } from './utils.js'

// TODO add cursor for highlighting hover area (and possibly showing alt)
// TODO some bugs relating to having multiple artboards (maybe need to have separate places to store colors and data url, since these can get mixed up)
// TODO bugs relating to undo, since it only considers one artboard
// TODO enable deleting artboards
// TODO add more options for combining canvases
// TODO fix bugs present in the SVG convert (doesn't quite work when there are tranparent holes)

// TODO palettes / presets

function init() {
  elements.windows = {
    colors: new NavWindow({
      name: 'colors',
      container: elements.body,
      isOpen: true,
      x: 20,
      y: 380,
      content: nav => {
        new TextArea({
          container: nav.contentWrapper,
          className: 'colors',
          action: e => {
            settings.colors = e.target.value.split(',')
            elements.artboard.paintCanvas()
          },
          buttons: [
            {
              className: 'icon generate',
              action: textArea => {
                settings.colors = textArea.value
                elements.artboard.paintCanvas()
              },
            },
            {
              className: 'icon copy',
              action: textArea => textArea.copyText(),
            },
          ],
        })
      },
    }),
    dataUrl: new NavWindow({
      name: 'dataUrl / svg',
      container: elements.body,
      isOpen: true,
      x: 220,
      y: 380,
      content: nav => {
        new TextArea({
          container: nav.contentWrapper,
          inputName: 'dataUrl',
          action: e => {
            if (!elements.artboard) return
            elements.artboard.dataUrl = e.target.value
          },
          buttons: [
            {
              className: 'icon output-from-data-url',
              action: () => {
                if (elements.artboard?.dataUrl?.[0] === 'd') {
                  elements.artboard.output()
                }
              },
            },
            {
              className: 'icon copy',
              action: textArea => textArea.copyText(),
            },
          ],
        })
      },
    }),
    artboard: settings.createNewArtboard(),
    main: new NavWindow({
      name: 'main',
      container: elements.body,
      isOpen: true,
      x: 380,
      y: 20,
      content: nav => {
        ;[
          'column',
          'row',
          'cellSize',
          'color',
          'hex',
          'color2',
          'hex2',
        ].forEach(inputName => {
          const isNum = ['column', 'row', 'cellSize'].includes(inputName)
          const inputClass = ['column', 'row'].includes(inputName)
            ? SizeInput
            : Input
          settings.inputs[inputName] = new inputClass({
            inputName,
            container: nav.contentWrapper,
            isNum,
            className: isNum ? 'no' : '',
            update: isNum
              ? () => elements.artboard.resizeAndPaintCanvas()
              : null,
          })
        })
        nav.addButtons([
          {
            btnText: 'swapColor',
            action: () => {
              settings.inputs.colors.value = settings.colors.map(c => {
                return c === settings.hex ? settings.hex2 : c
              })
              elements.artboard.paintCanvas()
            },
          },
        ])
      },
    }),
    fileName: new NavWindow({
      name: 'fileName',
      container: elements.body,
      x: 580,
      y: 100,
      isOpen: false,
      content: nav => {
        settings.inputs.filename = new Input({
          inputName: 'filename',
          container: nav.contentWrapper,
        })
        new Upload({ container: nav.contentWrapper })
        nav.addButtons([
          {
            className: 'download-file',
            action: () => {
              ;['paintCanvas', 'downloadImage'].forEach(action =>
                elements.artboard[action]()
              )
            },
          },
          {
            className: 'output-data-url-from-image',
            action: () => {
              elements.artboard.dataUrl =
                elements.artboard.drawboard.el.toDataURL()
              settings.inputs.dataUrl.value = elements.artboard.dataUrl
            },
          },
          {
            className: 'output-data-url-from-one-pixel-image',
            action: () => {
              // could be refactored to partially reuse this codeblock
              const currentCellSize = settings.cellSize
              settings.inputs.cellSize.value = 1
              elements.artboard.resizeAndPaintCanvas()

              elements.artboard.dataUrl =
                elements.artboard.drawboard.el.toDataURL()
              settings.inputs.dataUrl.value = elements.artboard.dataUrl

              setTimeout(() => {
                settings.inputs.cellSize.value = currentCellSize
                elements.artboard.resizeAndPaintCanvas()
              }, 500)
            },
          },
          {
            className: 'trace-svg',
            action: () => {
              new TraceSvg()
            },
          },
        ])
      },
    }),
    select: new NavWindow({
      name: 'select',
      container: elements.body,
      x: 430,
      y: 90,
      isVertical: true,
      content: nav =>
        nav.addButtons([
          {
            className: 'select-state',
            action: () => elements.artboard.toggleSelectState(),
          },
          {
            className: 'copy-selection',
            action: () => {
              if (elements.artboard.selectBox)
                elements.artboard.selectBox.copy()
            },
          },
          {
            className: 'paste-selection',
            action: () => {
              const { selectBox } = elements.artboard
              if (selectBox && selectBox.copyData.length) selectBox.paste()
            },
          },
          {
            className: 'cut-selection',
            action: () => {
              if (elements.artboard.selectBox) elements.artboard.selectBox.cut()
            },
          },
          {
            className: 'crop-selection',
            action: () => {
              if (elements.artboard.selectBox)
                elements.artboard.selectBox.crop()
            },
          },
          {
            className: 'flip-h',
            action: () => {
              if (elements.artboard.selectBox.copyData.length)
                elements.artboard.selectBox.flipHorizontal()
            },
          },
          {
            className: 'flip-v',
            action: () => {
              if (elements.artboard.selectBox.copyData.length)
                elements.artboard.selectBox.flipVertical()
            },
          },
        ]),
    }),
    draw: new NavWindow({
      name: 'draw',
      container: elements.body,
      x: 500,
      y: 90,
      isVertical: true,
      isOpen: true,
      content: nav =>
        nav.addButtons([
          {
            className: 'undo',
            action: () => settings.undo(),
          },
          {
            className: 'fill',
            action: b => {
              b.el.classList.toggle('active')
              settings.fill = !settings.fill
            },
          },
          {
            className: 'clear',
            action: b => {
              b.el.classList.toggle('active')
              settings.erase = !settings.erase
            },
          },
          {
            className: 'flip-h',
            action: () => elements.artboard.flipHorizontal(),
          },
          {
            className: 'flip-v',
            action: () => elements.artboard.flipVertical(),
          },
          {
            className: 'grid-display',
            action: () => {
              settings.shouldShowGrid = !settings.shouldShowGrid
              elements.artboard.overlay[
                settings.shouldShowGrid ? 'drawGrid' : 'clearGrid'
              ]()
            },
          },
          {
            className: 'new-grid',
            action: () => {
              ;['resize', 'refresh', 'paintCanvas'].forEach(action =>
                elements.artboard[action]()
              )
            },
          },
          {
            className: 'color-picker',
            action: b => {
              b.el.classList.toggle('active')
              settings.colorPick = !settings.colorPick
            },
          },
        ]),
    }),
    test: new NavWindow({
      name: 'test',
      container: elements.body,
      x: 580,
      y: 180,
      isOpen: true,
      content: nav =>
        nav.addButtons([
          {
            btnText: 'new board',
            action: settings.createNewArtboard,
          },
          {
            btnText: 'show elements',
            action: () => {
              console.log('elements', elements)
            },
          },
          {
            btnText: 'show setting',
            action: () => {
              console.log('settings', settings)
            },
          },
          {
            btnText: 'combine',
            action: () => settings.combineArtboards(),
          },
        ]),
    }),
  }

  elements.readData()
  settings.recordState()
  mouse.up(document, 'add', () => settings.recordState())
}

window.addEventListener('DOMContentLoaded', init)
