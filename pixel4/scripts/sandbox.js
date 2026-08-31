import { getData } from '../../config.js'

const SANDBOX_SAVE_DATA = 'sandbox-save-data'

// TODO allow config save / download
// TODO allow ratio change (based on this, multiplies the size of stamp and stamped image)

window.addEventListener('DOMContentLoaded', () => {
  const menu = document.getElementById('menu')
  const stamp = document.querySelector('.stamp')

  const nearestN = (x, n = 2) =>
    x === 0 ? 0 : x - 1 + Math.abs(((x - 1) % n) - n)

  const settings = {
    activeElement: null,
    elements: [],
    blocks: [],
    artboardWindow: null,
    parameterWindow: null,
    stampImg: null,
    deleteMode: false,
  }
  class PageObject {
    constructor() {
      this.pos = { x: 0, y: 0 }
      this.grabSize = { w: 0, h: 0 }
      this.pointerPos = { x: 0, y: 0 }
    }
    setPos(pos) {
      if (pos) this.pos = { x: nearestN(pos.x), y: nearestN(pos.y) }
      this.el.style.transform = `translate(${this.pos.x}px, ${this.pos.y}px)`
    }
    setSize(size) {
      this.size = size
      Object.assign(this.el.style, {
        width: `${size.w}px`,
        height: `${size.h}px`,
      })
    }
  }

  class Window extends PageObject {
    constructor(
      { size, pos } = { size: { w: 200, h: 100 }, pos: { x: 0, y: 0 } }
    ) {
      super()
      this.el = Object.assign(document.createElement('div'), {
        className: 'window',
        innerHTML:
          '<div class="window-handle" data-id="window" >artboard</div>' +
          '<div class="artboard"></div>' +
          '<div class="size-handle" data-id="window" ></div>',
      })
      this.id = 'window'

      document.body.appendChild(this.el)
      settings.artboardWindow = this
      this.artboard = this.el.querySelector('.artboard')
      settings.elements.push(this)

      this.setSize(size)
      this.setPos(pos)

      this.artboard.addEventListener('click', e => {
        if (settings.stampImg) {
          const { column, row } = settings.stampImg
          const { x, y } = settings.artboardWindow.pos
          new Block({
            ...settings.stampImg,
            pos: { x: e.pageX - column / 2 - x, y: e.pageY - row / 2 - y - 20 },
          })
        }
      })
    }
  }

  class Parameter extends PageObject {
    constructor(pos) {
      super()
      this.el = Object.assign(document.createElement('div'), {
        className: 'window',
        innerHTML:
          '<div class="window-handle" data-id="parameter" >parameter</div>' +
          '<div class="content"></div>',
      })
      this.id = 'parameter'

      document.body.appendChild(this.el)
      this.content = this.el.querySelector('.content')
      settings.elements.push(this)
      settings.parameterWindow = this
      ;['x', 'y', 'z', 'ratio'].forEach(param => {
        const input = Object.assign(document.createElement('div'), {
          innerHTML:
            '<div class="input-wrapper">' +
            `<label>${param}</label>` +
            `<input type="number" placeholder="${param}" data-type="${param}" />` +
            '</div>',
        })
        this.content.appendChild(input)
        input.querySelector('input').addEventListener('change', e => {
          this[param] = +e.target.value
          if (settings.focusElement) {
            settings.focusElement[param] = +e.target.value
            settings.focusElement.setPos()
          }
        })
      })

      this.setSize({ w: 200, h: 120 })
      if (pos) this.setPos(pos)
    }
    setParam(param, value) {
      this[param] = value
      this.content.querySelector(`[data-type=${param}]`).value = value
    }
  }

  window.addEventListener('pointerdown', e => {
    console.log(e.target.dataset.id)
    const el = settings.elements.find(
      element => element.id === e.target.dataset.id
    )
    if (el) {
      if (settings.deleteMode) {
        el.el.remove()
        settings.elements = settings.elements.filter(element => element !== el)
        settings.blocks = settings.blocks.filter(block => block !== el)
      } else {
        settings.activeElement = el
        el.pointerPos = { x: e.pageX - el.pos.x, y: e.pageY - el.pos.y }
        el.grabSize = {
          w: el.size.w - el.pos.x,
          h: el.size.h - el.pos.y,
        }
      }
    }
  })
  ;['pointerup', 'pointercancel'].forEach(action => {
    window.addEventListener(action, () => {
      if (settings.activeElement instanceof Block) {
        settings.focusElement = settings.activeElement
        settings.parameterWindow.setParam('x', settings.activeElement.pos.x)
        settings.parameterWindow.setParam('y', settings.activeElement.pos.y)
        settings.parameterWindow.setParam(
          'z',
          settings.blocks.indexOf(settings.activeElement)
        )
      }

      settings.activeElement = null
      localStorage.setItem(
        SANDBOX_SAVE_DATA,
        JSON.stringify({
          artboard: settings.artboardWindow,
          parameter: settings.parameterWindow,
          blocks: settings.blocks.sort((a, b) => a.z - b.z),
        })
      )
    })
  })

  window.addEventListener('pointermove', e => {
    e.target.setPointerCapture(e.pointerId)
    const el = settings.activeElement
    if (el && !settings.stampImg) {
      if (e.target.classList.contains('size-handle')) {
        el.setSize({
          w: el.grabSize.w + (e.pageX - el.pointerPos.x),
          h: el.grabSize.h + (e.pageY - el.pointerPos.y),
        })
      } else {
        el.setPos({
          x: e.pageX - el.pointerPos.x,
          y: e.pageY - el.pointerPos.y,
        })
      }
    } else {
      stamp.style.transform = `translate(${e.pageX}px, ${e.pageY}px)`
    }
  })
  class Block extends PageObject {
    constructor({ dataUrl, column, row, name, id, pos, size }) {
      super()
      this.el = Object.assign(document.createElement('div'), {
        className: 'block',
        innerHTML: `<img src="${dataUrl}" />`,
      })
      settings.elements.push(this)
      settings.blocks.push(this)
      this.dataUrl = dataUrl
      this.name = name
      this.id =
        id || `${name}-${settings.blocks.filter(b => b.name === name).length}`
      this.el.dataset.id = this.id
      settings.artboardWindow.artboard.appendChild(this.el)

      this.setSize(size || { w: column, h: row })
      if (pos) this.setPos(pos)
      this.z = settings.blocks.indexOf(this)
    }
    set x(value) {
      this.pos.x = value
    }
    set y(value) {
      this.pos.y = value
    }
    set z(value) {
      this._z = value
      this.el.style.zIndex = value
    }
    get z() {
      return this._z
    }
  }

  const savedData = localStorage.getItem(SANDBOX_SAVE_DATA)

  if (savedData) {
    const data = JSON.parse(savedData)
    new Window(data.artboard)
    new Parameter(data.parameter.pos)

    data.blocks.forEach(b => new Block(b))
  } else {
    new Window()
    new Parameter()
  }

  getData().forEach(d => {
    const box = Object.assign(document.createElement('div'), {
      className: 'box',
      innerHTML: `<img draggable="false" src="${d.dataUrl}" />`,
    })
    menu.appendChild(box)
    box.dataset.size = `${d.column} x ${d.row}`
    box.addEventListener('click', () => {
      stamp.innerHTML = `<img src="${d.dataUrl}" />`
      settings.stampImg = d
      menu.hidePopover()
    })
  })

  document.querySelector('.clear-stamp').addEventListener('click', () => {
    stamp.innerHTML = ''
    settings.stampImg = null
  })

  window.addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'd') settings.deleteMode = true
  })
  window.addEventListener('keyup', e => {
    if (e.key.toLowerCase() === 'd') settings.deleteMode = false
  })

  const downloadImage = canvas => {
    const link = document.createElement('a')
    link.download = `sandbox_${new Date().getTime()}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  document.querySelector('.save').addEventListener('click', () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const { w, h } = settings.artboardWindow.size
    canvas.setAttribute('width', w)
    canvas.setAttribute('height', h)
    settings.blocks.forEach(b => {
      ctx.drawImage(
        b.el.querySelector('img'),
        b.pos.x,
        b.pos.y,
        b.size.w,
        b.size.h
      )
    })
    downloadImage(canvas)
  })
})
