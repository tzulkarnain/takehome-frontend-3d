import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render } from 'vitest-browser-react'
import { page } from 'vitest/browser'
import * as THREE from 'three'
import { buildShape } from '../3d/buildShape'

vi.mock('../notification', () => ({
  getNotificationCenter: vi.fn(),
}))

vi.mock('../3d/engine', () => ({
  default: {
    getInstance: vi.fn(),
  },
}))

import { ShapeNode } from './ShapeTree'
import { getNotificationCenter } from '../notification'
import ThreeEngineController from '../3d/engine'

describe('ShapeNode', () => {
  const mockNotify = vi.fn()
  const mockGetObjectsInScene = vi.fn(() => [])

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getNotificationCenter).mockReturnValue({
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      notify: mockNotify,
    })
    vi.mocked(ThreeEngineController.getInstance).mockReturnValue({
      getObjectsInScene: mockGetObjectsInScene,
      getObjectCount: vi.fn(() => 0),
    } as any)
  })

  test('renders shape name, geometry type, and color indicator', async () => {
    const shape = buildShape('sphere')
    render(<ShapeNode shape={shape} selectedShape={null} index={0} level={0} />)

    await expect.element(page.getByText('Shape 1')).toBeVisible()
    await expect.element(page.getByText('(Sphere)')).toBeVisible()
    await expect.element(page.getByTitle('Delete shape')).toBeVisible()
  })

  test('delete button removes shape from parent and fires shapeRemoved', async () => {
    const parent = new THREE.Object3D()
    const shape = buildShape('cube')
    parent.add(shape)

    render(<ShapeNode shape={shape} selectedShape={null} index={1} level={0} />)

    await page.getByTitle('Delete shape').click()

    expect(parent.children).not.toContain(shape)
    expect(mockNotify).toHaveBeenCalledWith('shapeRemoved', expect.any(Array))
  })

  test('delete button also clears selection when the deleted shape is selected', async () => {
    const parent = new THREE.Object3D()
    const shape = buildShape('cylinder')
    parent.add(shape)

    render(<ShapeNode shape={shape} selectedShape={shape} index={0} level={0} />)

    await page.getByTitle('Delete shape').click()

    expect(mockNotify).toHaveBeenCalledWith('shapeRemoved', expect.any(Array))
    expect(mockNotify).toHaveBeenCalledWith('shapeSelected', null)
  })

  test('delete button does not clear selection when a different shape is selected', async () => {
    const parent = new THREE.Object3D()
    const shape = buildShape('sphere')
    const otherShape = buildShape('cube')
    parent.add(shape)

    render(<ShapeNode shape={shape} selectedShape={otherShape} index={0} level={0} />)

    await page.getByTitle('Delete shape').click()

    expect(mockNotify).toHaveBeenCalledWith('shapeRemoved', expect.any(Array))
    expect(mockNotify).not.toHaveBeenCalledWith('shapeSelected', null)
  })

  test('renders child shapes recursively', async () => {
    const parent = buildShape('cube')
    const child = buildShape('sphere')
    parent.add(child)

    render(<ShapeNode shape={parent} selectedShape={null} index={0} level={0} />)

    await expect.element(page.getByText('Shape 1', { exact: true })).toBeVisible()
    await expect.element(page.getByText('Child Shape 1', { exact: true })).toBeVisible()
  })
})
