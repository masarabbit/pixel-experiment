import { px, nearestN, roundedClient, mouse } from '../utils.js'
import { settings, elements } from '../elements.js'

class PageObject {
  constructor(props) {
    Object.assign(this, {
      grabPos: { a: { x: 0, y: 0 }, b: { x: 0, y: 0 } },
      ...props,
    })
  }
  // syncSize() {
  //   const { width, height } = this.el
  //     .querySelector('div')
  //     .getBoundingClientRect()
  //   this.w = width
  //   this.h = height
  // }
  get pos() {
    return {
      x: this.x,
      y: this.y,
    }
  }
  get size() {
    return {
      w: this.w,
      h: this.h,
    }
  }
  get column() {
    return this.w / settings.d
  }
  get row() {
    return this.h / settings.d
  }
  get cellSize() {
    return this.d
  }
  setStyles() {
    Object.assign(this.el.style, {
      left: px(this.x || 0),
      top: px(this.y || 0),
      width: px(this.w),
      height: px(this.h || this.w),
    })
  }
  addToPage() {
    // this.setStyles()
    this.container.appendChild(this.el)
  }
  remove() {
    // TODO note that this doesn't necessarily clear the object
    this.el.remove()
  }
  touchPos(e) {
    return {
      x: nearestN(roundedClient(e, 'X'), settings.d),
      y: nearestN(roundedClient(e, 'Y'), settings.d),
    }
  }
  addDragEvent() {
    // mouse.down(this.el, 'add', this.onGrab)
    elements.draggableElements.push(this)
  }
  drag = (x, y) => {
    this.grabPos.a.x = this.grabPos.b.x - x
    this.grabPos.a.y = this.grabPos.b.y - y
    this.x -= this.grabPos.a.x
    this.y -= this.grabPos.a.y
    this.setStyles()
  }
  onGrab = e => {
    this.grabPos.b = { x: e.pageX, y: e.pageY }
    ;['pointerup', 'pointercancel'].forEach(action =>
      this.el.addEventListener(action, this.onLetGo)
    )
    this.el.addEventListener('pointermove', this.onDrag)
  }
  onDrag = e => {
    e.target.setPointerCapture(e.pointerId)
    this.canMove ? this.drag(e.pageX, e.pageY) : this.resizeBox(e)
    this.grabPos.b.x = e.pageX
    this.grabPos.b.y = e.pageY
  }
  onLetGo = () => {
    ;['pointerup', 'pointercancel'].forEach(action =>
      this.el.removeEventListener(action, this.onLetGo)
    )
    this.el.removeEventListener('pointermove', this.onDrag)
    if (this.releaseAction) this.releaseAction()
  }
  resizeBox = e => {
    const { defPos } = this
    const { x, y } = elements.artboard.drawPos(e)
    this.x = x > defPos.x ? defPos.x : x
    this.y = y > defPos.y ? defPos.y : y
    this.resizeCanvas({
      w: Math.abs(defPos.x - x),
      h: Math.abs(defPos.y - y),
    })
  }
}

export default PageObject
