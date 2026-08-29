import { SAVE_DATA_NAME, sample } from '../../config.js'

window.addEventListener('DOMContentLoaded', () => {
  class PageObject {
    constructor() {
      this.pos = { x: 0, y: 0 }
      this.grabSize = { w: 0, h: 0 }
      this.pointerPos = { x: 0, y: 0 }
    }
    setPos(pos) {
      this.pos = pos
      this.el.style.transform = `translate(${pos.x}px, ${pos.y}px)`
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
    constructor() {
      super()
      this.el = Object.assign(document.createElement('div'), {
        className: 'window',
        innerHTML:
          '<div class="window-handle">TEST</div>' +
          '<div class="artboard"></div>' +
          '<div class="size-handle"></div>',
      })
      this.isWindowActive = false

      document.body.appendChild(this.el)
      this.artboard = this.el.querySelector('.artboard')

      this.setSize({ w: 200, h: 100 })

      this.el.addEventListener('pointerdown', e => {
        this.isWindowActive = true
        this.pointerPos = { x: e.pageX - this.pos.x, y: e.pageY - this.pos.y }
        this.grabSize = {
          w: this.size.w - this.pos.x,
          h: this.size.h - this.pos.y,
        }
      })
      ;['pointerup', 'pointercancel'].forEach(action => {
        this.el.addEventListener(action, () => {
          this.isWindowActive = false
        })
      })

      this.el.addEventListener('pointermove', e => {
        e.target.setPointerCapture(e.pointerId)
        if (this.isWindowActive) {
          if (e.target.classList.contains('size-handle')) {
            this.setSize({
              w: this.grabSize.w + (e.pageX - this.pointerPos.x),
              h: this.grabSize.h + (e.pageY - this.pointerPos.y),
            })
          } else {
            this.setPos({
              x: e.pageX - this.pointerPos.x,
              y: e.pageY - this.pointerPos.y,
            })
          }
        }
      })
    }
  }

  new Window()
})
