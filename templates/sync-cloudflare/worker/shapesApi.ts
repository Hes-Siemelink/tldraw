import { IRequest } from 'itty-router'

// Mock shape data for now
const mockShapes = [
	{
		id: 'shape:abc123',
		type: 'geo',
		x: 100,
		y: 100,
		rotation: 0,
		props: {
			geo: 'rectangle',
			w: 200,
			h: 100,
			text: 'Hello World'
		}
	},
	{
		id: 'shape:def456',
		type: 'geo',
		x: 300,
		y: 200,
		rotation: 0,
		props: {
			geo: 'ellipse',
			w: 150,
			h: 150,
			text: 'Circle'
		}
	},
	{
		id: 'shape:ghi789',
		type: 'text',
		x: 50,
		y: 50,
		rotation: 0,
		props: {
			text: 'Sample Text',
			w: 100,
			h: 30
		}
	}
]

// List shapes in a room
export async function handleListShapes(request: IRequest, env: Env): Promise<Response> {
	const roomId = request.params.roomId
	const url = new URL(request.url)
	const type = url.searchParams.get('type')
	
	let shapes = mockShapes
	if (type) {
		shapes = shapes.filter(shape => shape.type === type)
	}
	
	return Response.json({
		shapes,
		total: shapes.length,
		roomId
	})
}

// Get a specific shape
export async function handleGetShape(request: IRequest, env: Env): Promise<Response> {
	const { roomId, shapeId } = request.params
	const shape = mockShapes.find(s => s.id === shapeId)
	
	if (!shape) {
		return Response.json(
			{ error: 'Shape not found', code: 'SHAPE_NOT_FOUND' },
			{ status: 404 }
		)
	}
	
	return Response.json(shape)
}

// Create a new shape
export async function handleCreateShape(request: IRequest, env: Env): Promise<Response> {
	const roomId = request.params.roomId
	
	try {
		const body = await request.json()
		
		// Generate a mock ID
		const newId = `shape:${Math.random().toString(36).substr(2, 9)}`
		
		const newShape = {
			id: newId,
			type: body.type || 'geo',
			x: body.x || 0,
			y: body.y || 0,
			rotation: body.rotation || 0,
			props: body.props || {}
		}
		
		// In real implementation, this would save to the durable object
		// For now, just return the created shape
		return Response.json(newShape, { status: 201 })
		
	} catch (error) {
		return Response.json(
			{ error: 'Invalid JSON body', code: 'VALIDATION_ERROR' },
			{ status: 400 }
		)
	}
}

// Update an existing shape
export async function handleUpdateShape(request: IRequest, env: Env): Promise<Response> {
	const { roomId, shapeId } = request.params
	const shape = mockShapes.find(s => s.id === shapeId)
	
	if (!shape) {
		return Response.json(
			{ error: 'Shape not found', code: 'SHAPE_NOT_FOUND' },
			{ status: 404 }
		)
	}
	
	try {
		const updates = await request.json()
		
		// Merge updates with existing shape
		const updatedShape = {
			...shape,
			...updates,
			props: { ...shape.props, ...updates.props }
		}
		
		// In real implementation, this would update the durable object
		return Response.json(updatedShape)
		
	} catch (error) {
		return Response.json(
			{ error: 'Invalid JSON body', code: 'VALIDATION_ERROR' },
			{ status: 400 }
		)
	}
}

// Delete a shape
export async function handleDeleteShape(request: IRequest, env: Env): Promise<Response> {
	const { roomId, shapeId } = request.params
	const shape = mockShapes.find(s => s.id === shapeId)
	
	if (!shape) {
		return Response.json(
			{ error: 'Shape not found', code: 'SHAPE_NOT_FOUND' },
			{ status: 404 }
		)
	}
	
	// In real implementation, this would delete from the durable object
	return Response.json({
		deleted: true,
		id: shapeId
	})
}

// Get room info
export async function handleGetRoom(request: IRequest, env: Env): Promise<Response> {
	const roomId = request.params.roomId
	
	return Response.json({
		id: roomId,
		name: `Room ${roomId}`,
		shapeCount: mockShapes.length,
		created: '2025-10-25T10:00:00Z'
	})
}