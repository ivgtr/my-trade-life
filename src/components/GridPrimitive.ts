import type {
  ISeriesPrimitive, SeriesAttachedParameter,
  IPrimitivePaneView, IPrimitivePaneRenderer,
  Time, SeriesType,
} from 'lightweight-charts'
import type { CanvasRenderingTarget2D } from 'fancy-canvas'
import { generateBoundaryTimes } from '../utils/chartTime'

const GRID_COLOR = '#2a2a3e'

/** 境界時刻→ピクセル座標変換（テスト可能な純関数） */
export function collectBoundaryCoordinates(
  boundaryTimes: number[],
  timeToCoordinate: (t: Time) => number | null,
): number[] {
  const coords: number[] = []
  for (const t of boundaryTimes) {
    const coord = timeToCoordinate(t as Time)
    if (coord !== null) coords.push(coord)
  }
  return coords
}

class GridRenderer implements IPrimitivePaneRenderer {
  private _xCoords: number[] = []

  update(xCoords: number[]): void {
    this._xCoords = xCoords
  }

  draw(target: CanvasRenderingTarget2D): void {
    if (this._xCoords.length === 0) return
    target.useBitmapCoordinateSpace(({ context: ctx, bitmapSize, horizontalPixelRatio }) => {
      ctx.strokeStyle = GRID_COLOR
      ctx.lineWidth = Math.max(1, Math.floor(horizontalPixelRatio))
      ctx.beginPath()
      for (const x of this._xCoords) {
        const bitmapX = Math.round(x * horizontalPixelRatio)
        ctx.moveTo(bitmapX, 0)
        ctx.lineTo(bitmapX, bitmapSize.height)
      }
      ctx.stroke()
    })
  }
}

class GridPaneView implements IPrimitivePaneView {
  private _renderer = new GridRenderer()

  update(xCoords: number[]): void {
    this._renderer.update(xCoords)
  }

  zOrder(): 'bottom' { return 'bottom' }

  renderer(): IPrimitivePaneRenderer {
    return this._renderer
  }
}

export class IntervalGridPrimitive implements ISeriesPrimitive<Time> {
  private _paneView = new GridPaneView()
  private _param: SeriesAttachedParameter<Time, SeriesType> | null = null
  private _boundaryTimes: number[]
  private _requestUpdate: (() => void) | null = null

  constructor(intervalMinutes: number) {
    this._boundaryTimes = generateBoundaryTimes(intervalMinutes)
  }

  /** Timeframe変更時に境界時刻を再生成し、再描画を要求 */
  setInterval(intervalMinutes: number): void {
    this._boundaryTimes = generateBoundaryTimes(intervalMinutes)
    this._requestUpdate?.()
  }

  attached(param: SeriesAttachedParameter<Time, SeriesType>): void {
    this._param = param
    this._requestUpdate = () => param.requestUpdate()
  }

  detached(): void {
    this._param = null
    this._requestUpdate = null
  }

  updateAllViews(): void {
    if (!this._param) return
    const timeScale = this._param.chart.timeScale()
    const xCoords = collectBoundaryCoordinates(
      this._boundaryTimes,
      (t) => timeScale.timeToCoordinate(t) as number | null,
    )
    this._paneView.update(xCoords)
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [this._paneView]
  }
}
