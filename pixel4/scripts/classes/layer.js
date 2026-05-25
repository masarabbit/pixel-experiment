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
        innerHTML: '<img />',
      }),
      id: props.i,
      canMove: true,
      x: defX,
      y: offset + props.i * defH,
      offset,
      defX,
      defH,
      ...props,
    })
    this.img = this.el.querySelector('img')
    elements.layersUi.nodes.push(this)
    elements.layersUi.el.append(this.el)
    this.img.src = elements.artboard.layers[this.id].el.toDataURL()
    this.addDragEvent()
    this.setStyles()
  }
  releaseAction() {
    elements.layersUi.nodes
      .sort((a, b) => a.y - b.y)
      .forEach((node, i) => {
        node.x = this.defX
        node.y = this.offset + i * this.defH
        node.setStyles()
      })

    //  elements.artboard.layers.sort((a, b) => {

    //  })
  }
}
