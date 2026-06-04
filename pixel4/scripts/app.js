import {
  Input,
  SizeInput,
  TextArea,
  Upload,
  ColorInput,
} from './classes/input.js'
import { NavWindow } from './classes/nav.js'
import TraceSvg from './classes/traceSvg.js'
import { editor, elements } from './elements.js'
import PageObject from './classes/pageObject.js'
import { LayerNode } from './classes/layer.js'
import { getPalette } from './utils.js'

// TODO add cursor for highlighting hover area (and possibly showing alt)
// TODO some bugs relating to having multiple artboards (maybe need to have separate places to store colors and data url, since these can get mixed up)
// TODO bugs relating to undo, since it only considers one artboard
// TODO fix bugs present in the SVG convert (doesn't quite work when there are tranparent holes)

window.addEventListener('DOMContentLoaded', () => {
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
            editor.colors = e.target.value.split(',')
            elements.artboard.paintCanvas()
          },
          buttons: [
            {
              className: 'icon generate',
              action: textArea => {
                editor.colors = textArea.value
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
                  elements.artboard.output(elements.artboard.dataUrl)
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
    layer: new NavWindow({
      name: 'layer',
      container: elements.body,
      // isVertical: true,
      x: 680,
      y: 180,
      isOpen: true,
      content: nav => {
        nav.addButtons([
          {
            btnText: 'add layer',
            action: () => {
              elements.artboard.addLayer()
            },
          },
          {
            btnText: 'create sprite',
            action: () => editor.createSpriteSheet(),
          },
        ])

        // TODO move this to each artboards
        elements.layersUi = {
          el: Object.assign(document.createElement('div'), {
            className: 'layer-ui',
          }),
        }
        nav.contentWrapper.append(elements.layersUi.el)
      },
    }),
    artboard: editor.createNewArtboard(),
    main: new NavWindow({
      name: 'main',
      container: elements.body,
      isOpen: true,
      x: 380,
      y: 20,
      content: nav => {
        ;[
          { inputName: 'column', isNum: true, inputClass: SizeInput },
          { inputName: 'row', isNum: true, inputClass: SizeInput },
          { inputName: 'cellSize', isNum: true, inputClass: SizeInput },
          { inputName: 'color', inputClass: ColorInput },
          { inputName: 'hex', inputClass: Input },
          { inputName: 'color2', inputClass: ColorInput },
          { inputName: 'hex2', inputClass: Input },
          { inputName: 'spriteCol', isNum: true, inputClass: Input },
          { inputName: 'spriteRow', isNum: true, inputClass: Input },
          {
            inputName: 'spriteOffset',
            isNum: true,
            inputClass: Input,
            update: input => {
              elements.windows.preview.img.style.setProperty(
                '--offset-y',
                input.value
              )
            },
          },
        ].forEach(({ inputName, isNum, inputClass, update }) => {
          editor.inputs[inputName] = new inputClass({
            inputName,
            container: nav.contentWrapper,
            isNum,
            className: isNum ? 'no' : '',
            update,
          })
        })
        nav.addButtons([
          {
            btnText: 'swapColor',
            action: () => {
              editor.inputs.colors.value = editor.colors.map(c => {
                return c === editor.hex ? editor.hex2 : c
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
        editor.inputs.filename = new Input({
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
              editor.inputs.dataUrl.value = elements.artboard.dataUrl
            },
          },
          {
            className: 'output-data-url-from-one-pixel-image',
            action: () => {
              // could be refactored to partially reuse this codeblock
              const currentCellSize = editor.cellSize
              editor.inputs.cellSize.value = 1
              elements.artboard.resizeAndExtractColors()

              elements.artboard.dataUrl =
                elements.artboard.drawboard.el.toDataURL()
              editor.inputs.dataUrl.value = elements.artboard.dataUrl

              setTimeout(() => {
                editor.inputs.cellSize.value = currentCellSize
                elements.artboard.resizeAndExtractColors()
              }, 500)
            },
          },
          {
            btnText: 'make palette',
            action: nav => {
              elements.windows.palette.contentWrapper.innerHTML = `<div class="palette">
                ${getPalette(editor.colors).reduce((acc, color) => {
                  return (
                    acc +
                    `<div data-color="${color}" style="background-color: ${color};"></div>`
                  )
                }, '')}
              </div>`
            },
          },
          {
            className: 'trace-svg',
            action: () => {
              new TraceSvg()
            },
          },
          {
            btnText: 'split',
            action: () => editor.splitSpriteSheet(),
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
            shortCut: 's',
            action: () => elements.artboard.toggleSelectState(),
          },
          {
            className: 'copy-selection',
            shortCut: 'c',
            action: () => {
              if (elements.artboard.selectBox)
                elements.artboard.selectBox.copy()
            },
          },
          {
            className: 'paste-selection',
            shortCut: 'v',
            action: () => {
              const { selectBox } = elements.artboard
              if (selectBox && selectBox.copyData.length) selectBox.paste()
            },
          },
          {
            className: 'cut-selection',
            shortCut: 'x',
            action: () => {
              if (elements.artboard.selectBox) elements.artboard.selectBox.cut()
            },
          },
          {
            className: 'crop-selection',
            shortCut: 'k',
            action: () => {
              if (elements.artboard.selectBox)
                elements.artboard.selectBox.crop()
            },
          },
          {
            className: 'flip-h',
            action: () => {
              if (elements.artboard?.selectBox?.copyData.length)
                elements.artboard.selectBox.flipHorizontal()
            },
          },
          {
            className: 'flip-v',
            action: () => {
              if (elements.artboard?.selectBox?.copyData.length)
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
            action: () => editor.undo(),
          },
          {
            className: 'fill',
            shortCut: 'f',
            action: b => {
              b.classList.toggle('active')
              editor.fill = !editor.fill
            },
          },
          {
            className: 'clear',
            shortCut: 'e',
            action: b => {
              b.classList.toggle('active')
              editor.erase = !editor.erase
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
              editor.shouldShowGrid = !editor.shouldShowGrid
              elements.artboard.overlay[
                editor.shouldShowGrid ? 'drawGrid' : 'clearGrid'
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
            shortCut: 'p',
            action: b => {
              b.classList.toggle('active')
              editor.colorPick = !editor.colorPick
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
            action: editor.createNewArtboard,
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
              console.log('editor', editor)
            },
          },
          // {
          //   btnText: 'combine',
          //   action: () => editor.combineArtboards(),
          // },
        ]),
    }),
    preview: new NavWindow({
      name: 'preview',
      container: elements.body,
      x: 780,
      y: 180,
      isOpen: true,
      img: Object.assign(document.createElement('div'), {
        className: 'preview',
      }),
      content: nav => nav.contentWrapper.append(nav.img),
    }),
    palette: new NavWindow({
      name: 'palette',
      container: elements.body,
      x: 880,
      y: 180,
      isOpen: true,
    }),
  }

  document.querySelectorAll('button').forEach(b => {
    // TODO ref can be used to create a list of shortCut
    if (b.dataset.shortCut)
      editor.shortCuts[b.dataset.shortCut] = {
        button: b,
        ref: b.classList[1],
      }
  })

  window.addEventListener('click', e => {
    if (e.target.nodeName === 'BUTTON' && e.target.action) {
      e.target.action(e.target)
    } else if (e.target === elements.artboard.overlay.el) {
      elements.artboard.createSelectBox(e)
    } else if (e.target === elements.artboard.drawboard.el) {
      elements.artboard.colorCell(e)
    } else if (
      e.target?.dataset?.type === 'delete' &&
      elements.artboard.activeLayers.length > 1
    ) {
      if (window.confirm('are you sure?'))
        elements.artboard.deleteLayerNode(+e.target.dataset.id)
    } else if (e.target.dataset.id) {
      elements.artboard.layerNodes[+e.target.dataset.id].selectLayer()
    } else if (e.target?.dataset?.color)
      editor.updateColorInputs(e.target.dataset.color)
  })

  window.addEventListener('pointerdown', e => {
    if (e.target === elements.artboard.drawboard.el)
      elements.artboard.draw = true

    const draggableEl = elements.draggableElements.find(
      el => el.el === e.target
    )

    if (draggableEl) {
      draggableEl.onGrab(e)
    }
  })

  window.addEventListener('pointerup', e => {
    if (e.target === elements.artboard.drawboard.el)
      elements.artboard.draw = false

    //TODO move this? toggle layer show
    if (e.target?.dataset?.type === 'show') {
      elements.artboard.layers[+e.target.dataset.id].el.classList[
        e.target.checked ? 'add' : 'remove'
      ]('d-none')
    }

    editor.recordState()
    elements.updateLayersUi()
    elements.saveData()
  })

  window.addEventListener('pointercancel', () => {
    elements.artboard.draw = false
  })

  window.addEventListener('pointermove', e => {
    if (e.target === elements.artboard.drawboard.el)
      elements.artboard.continuousDraw(e)

    //TODO move this? toggle layer opacity
    if (e.target?.dataset?.type === 'opacity') {
      elements.artboard.layers[+e.target.dataset.id].el.style.opacity =
        1 * (e.target.value / 100)
    }
  })

  window.addEventListener('keyup', e => {
    const b = editor.shortCuts[e.key.toLowerCase()]
    if (b) b.button.action(b.button)
  })

  elements.readData()
  editor.recordState()
})
