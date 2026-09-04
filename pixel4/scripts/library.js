import { getLibraryData } from '../../config.js'

window.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.querySelector('.wrapper')

  getLibraryData().forEach(config => {
    const box = Object.assign(document.createElement('div'), {
      className: 'box',
      innerHTML: `<img draggable="false" src="${config.dataUrl}" />`,
    })
    wrapper.appendChild(box)
    box.dataset.size = `${config.column} x ${config.row}`
    box.addEventListener('click', () => {
      window.location = `./?img=${config.name}`
    })
  })
})
