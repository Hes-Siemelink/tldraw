import { IRequest } from 'itty-router'

// For now, let's use a simpler approach with mock data that persists in memory
// We can enhance this later to integrate with the real store
const roomShapes = new Map<string, any[]>()

// Initialize with some default shapes for testing
function getDefaultShapes() {
	return [
		{
			id: 'shape:default1',
			type: 'geo',
			x: 100,
			y: 100,
			rotation: 0,
			props: {
				geo: 'rectangle',
				w: 200,
				h: 100,
				text: 'Default Rectangle'
			}
		},
		{
			id: 'shape:default2',
			type: 'geo',
			x: 300,
			y: 200,
			rotation: 0,
			props: {
				geo: 'ellipse',
				w: 150,
				h: 150,
				text: 'Default Circle'
			}
		}
	]
}

// Get shapes for a room (creates default if none exist)
function getRoomShapes(roomId: string) {
	if (!roomShapes.has(roomId)) {
		roomShapes.set(roomId, getDefaultShapes())
	}
	return roomShapes.get(roomId)!
}

// Set shapes for a room
function setRoomShapes(roomId: string, shapes: any[]) {
	roomShapes.set(roomId, shapes)
}

// List shapes in a room
export async function handleListShapes(request: IRequest, env: Env): Promise<Response> {
	try {
		const roomId = request.params.roomId
		const url = new URL(request.url)
		const type = url.searchParams.get('type')
		
		let shapes = getRoomShapes(roomId)
		
		if (type) {
			shapes = shapes.filter(shape => shape.type === type)
		}
		
		return Response.json({
			shapes,
			total: shapes.length,
			roomId
		})
	} catch (error) {
		console.error('Error listing shapes:', error)
		return Response.json(
			{ error: 'Failed to list shapes', code: 'INTERNAL_ERROR' },
			{ status: 500 }
		)
	}
}

// Get a specific shape
export async function handleGetShape(request: IRequest, env: Env): Promise<Response> {
	try {
		const { roomId, shapeId } = request.params
		
		const shapes = getRoomShapes(roomId)
		const shape = shapes.find(s => s.id === shapeId)
		
		if (!shape) {
			return Response.json(
				{ error: 'Shape not found', code: 'SHAPE_NOT_FOUND' },
				{ status: 404 }
			)
		}
		
		return Response.json(shape)
	} catch (error) {
		console.error('Error getting shape:', error)
		return Response.json(
			{ error: 'Failed to get shape', code: 'INTERNAL_ERROR' },
			{ status: 500 }
		)
	}
}

// Create a new shape
export async function handleCreateShape(request: IRequest, env: Env): Promise<Response> {
	try {
		const roomId = request.params.roomId
		const body = await request.json()
		
		// Generate a unique ID
		const newId = `shape:${Math.random().toString(36).substr(2, 9)}`
		
		const newShape = {
			id: newId,
			type: body.type || 'geo',
			x: body.x || 0,
			y: body.y || 0,
			rotation: body.rotation || 0,
			props: body.props || {}
		}
		
		// Add to room shapes
		const shapes = getRoomShapes(roomId)
		shapes.push(newShape)
		setRoomShapes(roomId, shapes)
		
		return Response.json(newShape, { status: 201 })
		
	} catch (error) {
		console.error('Error creating shape:', error)
		return Response.json(
			{ error: 'Failed to create shape', code: 'VALIDATION_ERROR' },
			{ status: 400 }
		)
	}
}

// Update an existing shape
export async function handleUpdateShape(request: IRequest, env: Env): Promise<Response> {
	try {
		const { roomId, shapeId } = request.params
		
		const shapes = getRoomShapes(roomId)
		const shapeIndex = shapes.findIndex(s => s.id === shapeId)
		
		if (shapeIndex === -1) {
			return Response.json(
				{ error: 'Shape not found', code: 'SHAPE_NOT_FOUND' },
				{ status: 404 }
			)
		}
		
		const updates = await request.json()
		
		// Merge updates with existing shape
		const updatedShape = {
			...shapes[shapeIndex],
			...updates,
			props: { ...shapes[shapeIndex].props, ...(updates.props || {}) }
		}
		
		// Update the shape in place
		shapes[shapeIndex] = updatedShape
		setRoomShapes(roomId, shapes)
		
		return Response.json(updatedShape)
		
	} catch (error) {
		console.error('Error updating shape:', error)
		return Response.json(
			{ error: 'Failed to update shape', code: 'INTERNAL_ERROR' },
			{ status: 500 }
		)
	}
}

// Delete a shape
export async function handleDeleteShape(request: IRequest, env: Env): Promise<Response> {
	try {
		const { roomId, shapeId } = request.params
		
		const shapes = getRoomShapes(roomId)
		const shapeIndex = shapes.findIndex(s => s.id === shapeId)
		
		if (shapeIndex === -1) {
			return Response.json(
				{ error: 'Shape not found', code: 'SHAPE_NOT_FOUND' },
				{ status: 404 }
			)
		}
		
		// Remove the shape from the array
		shapes.splice(shapeIndex, 1)
		setRoomShapes(roomId, shapes)
		
		return Response.json({
			deleted: true,
			id: shapeId
		})
		
	} catch (error) {
		console.error('Error deleting shape:', error)
		return Response.json(
			{ error: 'Failed to delete shape', code: 'INTERNAL_ERROR' },
			{ status: 500 }
		)
	}
}

// Get room info
export async function handleGetRoom(request: IRequest, env: Env): Promise<Response> {
	try {
		const roomId = request.params.roomId
		const shapes = getRoomShapes(roomId)
		
		return Response.json({
			id: roomId,
			name: `Room ${roomId}`,
			shapeCount: shapes.length,
			created: '2025-10-25T10:00:00Z'
		})
	} catch (error) {
		console.error('Error getting room:', error)
		return Response.json(
			{ error: 'Failed to get room', code: 'INTERNAL_ERROR' },
			{ status: 500 }
		)
	}
}