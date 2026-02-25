import { useCallback } from 'react'
import { useGameContext } from '../hooks/useGameContext'
import { ACTIONS } from '../state/actions'

export default function LicenseScreen() {
  const { dispatch } = useGameContext()

  const handleBack = useCallback(() => {
    dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'title' } })
  }, [dispatch])

  return (
    <div className="flex flex-col items-center min-h-dvh bg-bg-deepest text-text-primary font-mono py-8 px-4">
      <h1 className="text-2xl font-bold tracking-[3px] mb-8 text-gold [text-shadow:0_0_16px_rgba(255,215,0,0.3)]">
        LICENSE
      </h1>

      <div className="w-full max-w-[600px] flex flex-col gap-6 mb-8">
        <section className="bg-bg-panel border border-bg-button rounded-lg p-5">
          <h2 className="text-base font-bold text-text-primary mb-3">My Trade Life</h2>
          <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">
            {'MIT License\n\nCopyright (c) 2025 ivgtr\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.'}
          </p>
        </section>

        <section className="bg-bg-panel border border-bg-button rounded-lg p-5">
          <h2 className="text-base font-bold text-text-primary mb-3">TradingView Lightweight Charts&#8482;</h2>
          <p className="text-xs text-text-secondary leading-relaxed mb-3">
            Apache License 2.0
          </p>
          <p className="text-xs text-text-secondary leading-relaxed mb-3">
            Copyright (c) 2025 TradingView, Inc.
          </p>
          <p className="text-xs text-text-secondary leading-relaxed mb-3">
            Licensed under the Apache License, Version 2.0. You may obtain a copy of the License at:
          </p>
          <a
            href="https://www.apache.org/licenses/LICENSE-2.0"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent underline hover:text-gold transition-colors duration-200"
          >
            https://www.apache.org/licenses/LICENSE-2.0
          </a>
          <div className="mt-4 pt-3 border-t border-bg-button">
            <a
              href="https://www.tradingview.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent underline hover:text-gold transition-colors duration-200"
            >
              https://www.tradingview.com/
            </a>
          </div>
        </section>
      </div>

      <button
        className="py-3 px-8 text-sm bg-bg-panel text-text-primary border border-bg-button rounded-lg cursor-pointer transition-colors duration-200 hover:bg-bg-elevated"
        onClick={handleBack}
      >
        Back to Title
      </button>
    </div>
  )
}
