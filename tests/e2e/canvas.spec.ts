import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Homepage')).toBeVisible()
})

test('has no console errors on load', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))
  await page.reload()
  await page.waitForTimeout(500)
  expect(errors).toEqual([])
})

test('clicking a node shows its findings in the side panel', async ({ page }) => {
  await page.getByText('Homepage').click()

  const panel = page.getByTestId('side-panel')
  await expect(panel.getByText('mybacs.ch')).toBeVisible()
  await expect(panel.getByText('78', { exact: false })).toBeVisible()
  await expect(panel.getByText('Trustpilot 4.6 badge', { exact: false })).toBeVisible()
})

test('clicking a seam shows its coherence finding', async ({ page }) => {
  // amber dot for the n1 -> n2 "break" seam
  await page.getByTestId('seam-dot').first().click({ force: true })

  const panel = page.getByTestId('side-panel')
  await expect(panel.getByText('Seam finding')).toBeVisible()
  await expect(panel.getByText('promise unfulfilled', { exact: false })).toBeVisible()
  await expect(panel.getByText('free gift', { exact: false })).toBeVisible()
})

test('pane click clears the selection', async ({ page }) => {
  await page.getByText('Homepage').click()
  await expect(page.getByTestId('side-panel').getByText('mybacs.ch')).toBeVisible()

  await page.mouse.click(500, 500)
  await expect(page.getByText('Click a node or seam')).toBeVisible()
})

test('Add URL creates a node and opens the URL modal', async ({ page }) => {
  await page.getByRole('button', { name: 'Add URL' }).click()
  await expect(page.getByText('Funnel step URL')).toBeVisible()

  await page.getByPlaceholder('https://example.com/checkout').fill('https://shop.example.com/pricing')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByText('Funnel step URL')).toBeHidden()
  await expect(page.getByText('shop.example.com', { exact: true })).toBeVisible()

  await page.getByText('shop.example.com', { exact: true }).click()
  await expect(page.getByTestId('side-panel').getByText('Not analyzed yet.')).toBeVisible()
})

test('canceling the URL modal leaves the node as an unset placeholder', async ({ page }) => {
  await page.getByRole('button', { name: 'Add URL' }).click()
  await page.getByRole('button', { name: 'Cancel' }).click()

  await expect(page.getByText('New URL')).toBeVisible()
  await page.getByText('New URL').click()
  await expect(page.getByTestId('side-panel').getByText('Set URL')).toBeVisible()
})

test('Paste email creates a node and saves the pasted content', async ({ page }) => {
  await page.getByRole('button', { name: 'Paste email' }).click()
  await page.locator('textarea').fill('Subject: Your order confirmation\n\nThanks for your order.')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByText('Subject: Your order confirmation')).toBeVisible()
})

test('deleting a node removes its connected seams', async ({ page }) => {
  await page.getByText('Product page').hover()
  await page.getByText('Product page').locator('..').getByRole('button').click()

  // both seams touched "Product page" (n2); deleting it should remove both edges
  await expect(page.getByTestId('seam-dot')).toHaveCount(0)
})

test('dragging a node updates its position', async ({ page }) => {
  const node = page.getByText('Cart').locator('../..')
  const before = await node.boundingBox()
  expect(before).not.toBeNull()

  await page.mouse.move(before!.x + 20, before!.y + 20)
  await page.mouse.down()
  await page.mouse.move(before!.x + 220, before!.y + 120, { steps: 10 })
  await page.mouse.up()

  const after = await node.boundingBox()
  expect(after!.x).not.toBeCloseTo(before!.x, 0)
})

test.describe('Run analysis (mocked backend)', () => {
  // Real capture/scoring needs live network + an ANTHROPIC_API_KEY, neither
  // available in CI/sandbox. These mock the three API routes at the browser
  // network layer to validate the frontend orchestration (composable, store
  // wiring, UI reactivity) independent of that - see README "Testing".

  test('scores nodes and seams end-to-end', async ({ page }) => {
    await page.route('**/api/capture', (route) =>
      route.fulfill({ json: { screenshot: 'data:image/png;base64,AAAA', text: 'mock extracted copy' } }),
    )
    await page.route('**/api/analyze-node', (route) =>
      route.fulfill({
        json: {
          score: 91,
          findings: [{ id: 'PC-001', verdict: 'present', text: 'mock finding' }],
          raw: {
            step_id: 'mock',
            findings: [{ pattern_id: 'PC-001', verdict: 'present', evidence: 'mock', confidence: 'high', suggested_fix: null }],
          },
        },
      }),
    )
    await page.route('**/api/analyze-edge', (route) =>
      route.fulfill({ json: { status: 'ok', findings: [{ type: 'confirmed', severity: 'none', text: 'mock: no discontinuities' }] } }),
    )

    await page.getByRole('button', { name: 'Run analysis' }).click()
    await expect(page.getByRole('button', { name: 'Run analysis' })).toBeVisible({ timeout: 15_000 })

    await page.getByText('Homepage').click()
    const panel = page.getByTestId('side-panel')
    await expect(panel.getByText('91')).toBeVisible()
    await expect(panel.getByText('mock finding')).toBeVisible()

    await page.mouse.click(500, 500)
    await page.getByTestId('seam-dot').first().click({ force: true })
    await expect(panel.getByText('mock: no discontinuities')).toBeVisible()
  })

  test('a failing node analysis is isolated - other nodes still complete', async ({ page }) => {
    await page.route('**/api/capture', (route) => {
      const body = route.request().postDataJSON() as { url: string }
      if (body.url.includes('mybacs.ch/products')) {
        return route.fulfill({ status: 502, json: { statusMessage: 'mock capture failure' } })
      }
      return route.fulfill({ json: { screenshot: 'data:image/png;base64,AAAA', text: 'mock copy' } })
    })
    await page.route('**/api/analyze-node', (route) =>
      route.fulfill({ json: { score: 85, findings: [], raw: { step_id: 'mock', findings: [] } } }),
    )
    await page.route('**/api/analyze-edge', (route) =>
      route.fulfill({ json: { status: 'ok', findings: [{ type: 'confirmed', severity: 'none', text: 'ok' }] } }),
    )

    await page.getByRole('button', { name: 'Run analysis' }).click()
    await expect(page.getByRole('button', { name: 'Run analysis' })).toBeVisible({ timeout: 15_000 })

    const panel = page.getByTestId('side-panel')

    await page.getByText('Product page').click()
    await expect(panel.getByText('mock capture failure')).toBeVisible()

    await page.mouse.click(500, 500)
    await page.getByText('Homepage').click()
    await expect(panel.getByText('85')).toBeVisible()
  })
})
