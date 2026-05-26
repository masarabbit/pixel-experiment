export const nearestN = (x, n) =>
  x === 0 ? 0 : x - 1 + Math.abs(((x - 1) % n) - n)
export const isNum = x => typeof x === 'number'
export const px = n => (!isNaN(n) ? `${Math.round(n)}px` : '')

// const n = Math.round(255 / 3)
const n = 1
export const rgbToHex = (r, g, b) => {
  if (r > 255 || g > 255 || b > 255) throw 'Invalid color component'
  return (
    (nearestN(r, n) << 16) |
    (nearestN(g, n) << 8) |
    nearestN(b, n)
  ).toString(16)
}

export const hex = rgb => '#' + ('000000' + rgb).slice(-6)

export const convertCameCase = string => {
  return string
    .split('')
    .map(letter => {
      return letter === letter.toUpperCase() || isNum(letter)
        ? ` ${letter.toLowerCase()}`
        : letter
    })
    .join('')
}

export const setProperties = (el, properties) => {
  Object.keys(properties).forEach(p => {
    el.style.setProperty(`--${p}`, properties[p])
  })
}
