import { settings, elements } from '../elements.js'

class TraceSvg {
  constructor(props) {
    const { column } = settings
    Object.assign(this, {
      pathData: [],
      column,
      direction: [1, column, -1, -column], // move right, down, left, up
      checkDirection: [-column, 1, column, -1], // check up, left, down, left of current cell
      directionFactor: [1, 1, -1, -1], // switches distance to move depending on which way the line is going.
      indexPattern: [0, 1, 2, 3, 0, 1, 2, 3],
      letters: 'hvhv',
      checkedIndex: [],
      pos: { x: 0, y: 0, h: 0, v: 0 },
      arr: [],
      cI: null,
      proceed: null,
      colors: settings.colors,
      ...props,
    })
    this.convertToSvg(this.colors)
    const gap = ' '
    // const gap = ''
    settings.inputs.dataUrl.value = this.pathData
      .map(p => {
        return `<path fill="${p.color}" d="${p.path.join(gap)}" ${
          p.isEvenOdd ? 'fill-rule="evenodd"' : ''
        }/>`
      })
      .join(' ')
      .replaceAll('ffffff', 'fff')
      .replaceAll('000000', '000')
      .replaceAll('*', 'transparent')
  }
  checkSurroundingCells = index => {
    return (
      !this.arr[index + this.checkDirection[this.cI]] || // cell in the check direction is the edge
      // below added to ensure trace don't continue on from right edge to left edge
      (this.cI === 1 && index % this.column === this.column - 1) ||
      (this.cI === 3 && index % this.column === 0)
    )
  }
  recordTraceData = (cItoCheck, index, path) => {
    // prevents same direction being checked twice.
    if (
      this.proceed &&
      !this.checkedIndex.some(i => i === cItoCheck) &&
      this.checkSurroundingCells(index)
    ) {
      const distanceToMove = this.directionFactor[this.cI]
      const prev = path.length - 1
      this.checkedIndex.push(cItoCheck)

      // increases distance to move if previous letter was the same (ie combines 'h1 h1' to 'h2')
      path[prev]?.letter === this.letters[this.cI]
        ? (path[prev].distanceToMove += distanceToMove)
        : path.push({
            letter: this.letters[this.cI],
            distanceToMove,
          })

      this.pos[this.letters[this.cI]] += distanceToMove
      if (this.pos.h === this.pos.x && this.pos.v === this.pos.y)
        this.proceed = false
      this.cI = this.cI === 3 ? 0 : this.cI + 1
    }
  }
  trace = (index, path) => {
    while (this.proceed) {
      this.indexPattern.forEach(i => this.recordTraceData(i, index, path))

      this.checkedIndex.length = 0
      this.cI = this.cI === 0 ? 3 : this.cI - 1
      index = index += this.direction[this.cI] // moves to next cell to trace
    }
  }
  calcX(cell) {
    return cell % this.column
  }
  calcY(cell) {
    return Math.floor(cell / this.column)
  }
  convertToSvg(colors) {
    // changed this to while loop to avoid exceeding maximum call limit
    while (colors.some(c => c !== '')) {
      const currentColor = colors.find(c => c !== '')
      const first = colors.indexOf(currentColor) //first index
      // isolating area to trace (area with same color, but connected)
      const areaToTrace = elements.artboard.fillArea({
        colors,
        i: first,
        valueToCheck: currentColor,
      })
      this.arr = colors.map((c, i) => (areaToTrace.some(a => a === i) ? c : ''))
      Object.assign(this.pos, {
        x: this.calcX(first),
        h: this.calcX(first),
        y: this.calcY(first),
        v: this.calcY(first),
      })

      const path = []
      this.cI = 0
      this.proceed = true
      this.trace(first, path) // recording traced area

      const tracedPath = [
        'M',
        this.pos.x,
        this.pos.y,
        ...path.map(p => `${p.letter}${p.distanceToMove}`),
      ]

      // TODO this doesn't catch every cases where there are 'donuts'
      const prevPathData = this.pathData[this.pathData.length - 1]
      // const isEvenOdd = prevPathData && (currentColor === 'transparent' || prevPathData.color === currentColor)
      const isEvenOdd = false

      if (isEvenOdd) {
        prevPathData.isEvenOdd = true
        prevPathData.path = prevPathData.path.concat(tracedPath)
      } else {
        this.pathData.push({
          color: currentColor,
          path: tracedPath,
        })
      }

      //* removing traced area
      // when only one square is being traced, area to be traced doesn't get overwritten, so needed to reset it to [],
      // and check below if it has been updated
      //TODO may not need this workaround when the areaToTrace/fill bucket logic is changed
      colors = areaToTrace.length
        ? colors.map((c, i) => (areaToTrace.indexOf(i) === -1 ? c : ''))
        : colors.map((c, i) => (i === first ? '' : c))
    }
  }
}

export default TraceSvg
