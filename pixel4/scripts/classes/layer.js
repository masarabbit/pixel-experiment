import PageObject from './pageObject.js'
import { elements } from '../elements.js'

// TODO add opacity toggle
export class LayerNode extends PageObject {
  constructor(props) {
    const offset = 100
    const defX = 6
    const defH = 42
    super({
      el: Object.assign(document.createElement('div'), {
        className: 'layer-node',
        innerHTML: `<img /> <input data-type="show" data-id="${props.i}" type="checkbox" checked/> <input data-type="opacity" data-id="${props.i}" type="range" min="0" max="100" value="100"/> <button data-type="delete" data-id="${props.i}">d</button>`,
      }),
      id: props.i,
      canMove: true,
      x: defX,
      y: offset,
      offset,
      defX,
      defH,
      ...props,
    })
    this.img = this.el.querySelector('img')
    this.artboard.activeLayerNodes.forEach(n => {
      n.y += this.defH
      n.setStyles()
    })
    elements.layersUi.el.append(this.el)
    this.artboard.layerNodes.push(this)
    const z = this.artboard.layerNodes.length
    this.el.style.zIndex = z
    this.artboard.layers[this.id].el.style.zIndex = z
    if (this.artboard.overlay) this.artboard.overlay.el.style.zIndex = z + 1
    this.img.src = this.artboard.layers[this.id].el.toDataURL()
    this.addDragEvent()
    this.setStyles()
  }
  touchPos(x, y) {
    //* setting as is so it doesn't lock to editor.d
    return {
      x,
      y,
    }
  }
  releaseAction() {
    this.artboard.activeLayerNodes
      .sort((a, b) => a.y - b.y)
      .forEach((node, i) => {
        if (i === 0) this.artboard.layerIndex = node.id
        node.x = this.defX
        node.y = this.offset + i * this.defH
        this.artboard.layers[node.id].el.style.zIndex =
          this.artboard.activeLayerNodes.length - i
        node.setStyles()
      })
    this.artboard.overlay.el.style.zIndex =
      this.artboard.activeLayerNodes.length + 1
  }
}
