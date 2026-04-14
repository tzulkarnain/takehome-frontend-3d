import $ from 'jquery'
import React, { useEffect, useState, type PropsWithChildren } from 'react'
import { createRoot } from 'react-dom/client'
import '../../styles/shape_properties.css'
import styles from './ShapeTree.module.css'
import { getNotificationCenter } from '../notification'
import type { Mesh, MeshBasicMaterial } from 'three'
import ThreeEngineController from '../3d/engine'

function getGeometryType(shape: Mesh): string {
  switch (shape.geometry.type) {
    case 'SphereGeometry': return 'Sphere'
    case 'BoxGeometry': return 'Cube'
    case 'CylinderGeometry': return 'Cylinder'
    default: return shape.geometry.type
  }
}

function getShapeColor(shape: Mesh): string {
  const material = shape.material as MeshBasicMaterial
  return material?.color ? `#${material.color.getHexString()}` : '#ffffff'
}

const ShapeList: React.FC = () => {
  const [projectName, setProjectName] = useState($('.project-name').text())
  const [numOfShapes, setNumOfShapes] = useState(0)
  const [shapes, setShapes] = useState<Mesh[]>([])
  const [selectedShape, setSelectedShape] = useState<Mesh | null>(null)

  useEffect(() => {
    const nc = getNotificationCenter()

    const onShapesChanged = (shapes: Mesh[]) => {
      setShapes(shapes)
      setNumOfShapes(ThreeEngineController.getInstance().getObjectCount())
    }
    const onShapeSelected = (shape: Mesh | null) => setSelectedShape(shape)
    const onProjectName = (newName: string) => setProjectName(newName)

    nc.subscribe('shapeAdded', onShapesChanged)
    nc.subscribe('shapeRemoved', onShapesChanged)
    nc.subscribe('shapeSelected', onShapeSelected)
    nc.subscribe('projectName', onProjectName)

    return () => {
      nc.unsubscribe('shapeAdded', onShapesChanged)
      nc.unsubscribe('shapeRemoved', onShapesChanged)
      nc.unsubscribe('shapeSelected', onShapeSelected)
      nc.unsubscribe('projectName', onProjectName)
    }
  }, [])

  return (
    <div className={styles.container}>
      <h3>{projectName}</h3>
      <span>{numOfShapes} objects</span>

      <div className={styles.treeContainer}>
        {shapes.map((shape, index) => (
          <ShapeNode
            key={shape.uuid}
            shape={shape}
            selectedShape={selectedShape}
            index={index}
            level={0}
          />
        ))}
      </div>
    </div>
  )
}

interface ShapeNodeProps {
  shape: Mesh
  selectedShape: Mesh | null
  index: number
  level: number
}

export const ShapeNode: React.FC<ShapeNodeProps> = ({ shape, selectedShape, index, level }) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    const nc = getNotificationCenter()
    shape.parent?.remove(shape)
    nc.notify('shapeRemoved', ThreeEngineController.getInstance().getObjectsInScene())
    if (selectedShape?.uuid === shape.uuid) {
      nc.notify('shapeSelected', null)
    }
  }

  const geometryType = getGeometryType(shape)
  const color = getShapeColor(shape)
  const label = level === 0 ? `Shape ${index + 1}` : `Child Shape ${index + 1}`

  return (
    <ShapeItem shape={shape} isSelected={shape.uuid === selectedShape?.uuid}>
      <div className={styles.shapeItemContent}>
        <div className={styles.shapeInfo}>
          <div className={styles.shapeColorIndicator} style={{ backgroundColor: color }} />
          <span className={styles.shapeName}>{label}</span>
          <span className={styles.shapeType}>({geometryType})</span>
        </div>
        <button
          className={styles.deleteButton}
          onClick={handleDelete}
          title="Delete shape"
        >
          ×
        </button>
      </div>
      {shape.children.length > 0 && (
        <div className={styles.childrenContainer}>
          {shape.children.map((child, childIndex) => (
            <ShapeNode
              key={child.uuid}
              shape={child as Mesh}
              selectedShape={selectedShape}
              index={childIndex}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </ShapeItem>
  )
}

function ShapeItem({
  children,
  isSelected,
  shape,
}: PropsWithChildren<{ isSelected: boolean; shape: Mesh }>) {
  return (
    <div
      className="shape-item"
      style={{ backgroundColor: isSelected ? '#ffff00' : 'transparent' }}
      onClick={e => {
        getNotificationCenter().notify('shapeSelected', shape)
        e.stopPropagation()
      }}
    >
      {children}
    </div>
  )
}

export function createShapeList() {
  const listRoot = document.getElementById('shape-properties')
  if (listRoot) {
    createRoot(listRoot).render(<ShapeList />)
  }
}
