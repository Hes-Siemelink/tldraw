import { TLRecord, TLRichText, TLShape, createShapeId, toRichText } from '@tldraw/tlschema'
import { IRequest } from 'itty-router'

type ShapeRequestBody = {
	id?: string
	type?: 'geo' | 'note'
	parentId?: string
	x?: number
	y?: number
	width?: number
	height?: number
	geo?: string
	color?: string
	labelColor?: string
	fill?: string
	dash?: string
	size?: string
	font?: string
	fontSizeAdjustment?: number
	align?: string
	verticalAlign?: string
	growY?: number
	url?: string
	scale?: number
	text?: string
	richText?: unknown
	meta?: Record<string, unknown>
	rotation?: number
	isLocked?: boolean
	opacity?: number
	index?: string
}

function normalizeRichText(value: unknown, fallback: string): TLRichText {
	if (value && typeof value === 'object') {
		const candidate = value as Partial<TLRichText>
		if (candidate.type === 'doc') {
			return candidate as TLRichText
		}
	}
	return toRichText(fallback)
}

// Helper function to send changes to the durable object
async function applyChangesToRoom(roomId: string, changes: any[], env: Env): Promise<boolean> {
	try {
		const durableObjectId = env.TLDRAW_DURABLE_OBJECT.idFromName(roomId)
		const durableObjectStub = env.TLDRAW_DURABLE_OBJECT.get(durableObjectId)

		const response = await durableObjectStub.fetch(
			`http://durable-object/api/room-changes/${roomId}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ changes }),
			}
		)

		if (!response.ok) {
			const bodyText = await response.text().catch(() => undefined)
			console.error('Durable object rejected room changes', {
				roomId,
				status: response.status,
				statusText: response.statusText,
				responseBody: bodyText,
			})
		}
		return response.ok
	} catch (error) {
		console.error('Failed to apply changes to room:', error)
		return false
	}
}

// Helper function to get current room state
async function getRoomState(roomId: string, env: Env): Promise<Record<string, TLRecord> | null> {
	try {
		const durableObjectId = env.TLDRAW_DURABLE_OBJECT.idFromName(roomId)
		const durableObjectStub = env.TLDRAW_DURABLE_OBJECT.get(durableObjectId)

		const response = await durableObjectStub.fetch(
			`http://durable-object/api/room-snapshot/${roomId}`
		)

		if (response.ok) {
			const data = await response.json()
			return data.records
		} else {
			const bodyText = await response.text().catch(() => undefined)
			console.error('Durable object snapshot request failed', {
				roomId,
				status: response.status,
				statusText: response.statusText,
				responseBody: bodyText,
			})
		}
	} catch (error) {
		console.error('Failed to get room state:', error)
	}
	return null
}

// List shapes in a room
export async function handleListShapes(request: IRequest, env: Env): Promise<Response> {
	try {
		const roomId = request.params.roomId
		const url = new URL(request.url)
		const type = url.searchParams.get('type')

		const records = await getRoomState(roomId, env)
		if (!records) {
			return Response.json({ shapes: [] })
		}

		// Extract shape records from the snapshot
		let shapes = Object.values(records || {}).filter((record: any) => record.typeName === 'shape')

		if (type) {
			shapes = shapes.filter((shape: any) => shape.type === type)
		}

		return Response.json({
			shapes,
			total: shapes.length,
			roomId,
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

		const records = await getRoomState(roomId, env)
		if (!records) {
			return Response.json({ error: 'Room not found' }, { status: 404 })
		}

		const shape = records[shapeId]
		if (!shape || shape.typeName !== 'shape') {
			return Response.json({ error: 'Shape not found', code: 'SHAPE_NOT_FOUND' }, { status: 404 })
		}

		return Response.json(shape)
	} catch (error) {
		console.error('Error getting shape:', error)
		return Response.json({ error: 'Failed to get shape', code: 'INTERNAL_ERROR' }, { status: 500 })
	}
}

// Create a new shape
export async function handleCreateShape(request: IRequest, env: Env): Promise<Response> {
	try {
		const roomId = request.params.roomId
		const body = (await request.json()) as ShapeRequestBody
		const records = await getRoomState(roomId, env)
		if (!records) {
			return Response.json({ error: 'Room not found' }, { status: 404 })
		}

		const parentId =
			body.parentId ?? Object.values(records).find((record: any) => record.typeName === 'page')?.id
		if (!parentId) {
			return Response.json({ error: 'No page available for shape' }, { status: 400 })
		}

		const shapeId = body.id || createShapeId()
		const baseShape = {
			id: shapeId,
			x: body.x ?? 0,
			y: body.y ?? 0,
			parentId,
			index: body.index ?? `a${Math.random().toString(36).slice(2, 8)}`,
			rotation: body.rotation ?? 0,
			isLocked: body.isLocked ?? false,
			opacity: body.opacity ?? 1,
			meta: body.meta ?? {},
			typeName: 'shape' as const,
		}

		const shapeType = body.type ?? 'geo'
		const richText = normalizeRichText(body.richText, body.text ?? '')

		let shape: TLShape
		if (shapeType === 'note') {
			shape = {
				...baseShape,
				type: 'note',
				props: {
					color: (body.color ?? 'yellow') as any,
					labelColor: (body.labelColor ?? 'black') as any,
					size: (body.size ?? 'm') as any,
					font: (body.font ?? 'draw') as any,
					fontSizeAdjustment: body.fontSizeAdjustment ?? 0,
					align: (body.align ?? 'middle') as any,
					verticalAlign: (body.verticalAlign ?? 'middle') as any,
					growY: body.growY ?? 0,
					url: body.url ?? '',
					richText,
					scale: body.scale ?? 1,
				},
			} as TLShape
		} else {
			shape = {
				...baseShape,
				type: 'geo',
				props: {
					w: body.width ?? 100,
					h: body.height ?? 100,
					geo: body.geo ?? 'rectangle',
					color: (body.color ?? 'black') as any,
					labelColor: (body.labelColor ?? 'black') as any,
					fill: (body.fill ?? 'none') as any,
					dash: (body.dash ?? 'draw') as any,
					size: (body.size ?? 'm') as any,
					font: (body.font ?? 'draw') as any,
					align: (body.align ?? 'middle') as any,
					verticalAlign: (body.verticalAlign ?? 'middle') as any,
					growY: body.growY ?? 0,
					url: body.url ?? '',
					scale: body.scale ?? 1,
					richText,
				},
			} as TLShape
		}

		const success = await applyChangesToRoom(
			roomId,
			[
				{
					type: 'create',
					record: shape,
				},
			],
			env
		)

		if (success) {
			return Response.json(
				{
					success: true,
					shape: shape,
				},
				{ status: 201 }
			)
		} else {
			return Response.json({ error: 'Failed to create shape' }, { status: 500 })
		}
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
		const body = (await request.json()) as ShapeRequestBody

		// Get current state to find existing shape
		const records = await getRoomState(roomId, env)
		if (!records) {
			return Response.json({ error: 'Room not found' }, { status: 404 })
		}

		const existingShape = records[shapeId]
		if (!existingShape || existingShape.typeName !== 'shape') {
			return Response.json({ error: 'Shape not found' }, { status: 404 })
		}

		const props = { ...existingShape.props } as Record<string, unknown>

		if (body.width !== undefined && 'w' in props) props.w = body.width
		if (body.height !== undefined && 'h' in props) props.h = body.height
		if (body.geo !== undefined && 'geo' in props) props.geo = body.geo
		if (body.color !== undefined && 'color' in props) props.color = body.color
		if (body.labelColor !== undefined && 'labelColor' in props) props.labelColor = body.labelColor
		if (body.fill !== undefined && 'fill' in props) props.fill = body.fill
		if (body.dash !== undefined && 'dash' in props) props.dash = body.dash
		if (body.size !== undefined && 'size' in props) props.size = body.size
		if (body.font !== undefined && 'font' in props) props.font = body.font
		if (body.align !== undefined && 'align' in props) props.align = body.align
		if (body.verticalAlign !== undefined && 'verticalAlign' in props)
			props.verticalAlign = body.verticalAlign
		if (body.growY !== undefined && 'growY' in props) props.growY = body.growY
		if (body.url !== undefined && 'url' in props) props.url = body.url
		if (body.scale !== undefined && 'scale' in props) props.scale = body.scale
		if (body.fontSizeAdjustment !== undefined && 'fontSizeAdjustment' in props)
			props.fontSizeAdjustment = body.fontSizeAdjustment
		if ((body.text !== undefined || body.richText !== undefined) && 'richText' in props) {
			props.richText = normalizeRichText(body.richText, body.text ?? '')
		}

		const updatedShape = {
			...existingShape,
			x: body.x ?? existingShape.x,
			y: body.y ?? existingShape.y,
			rotation: body.rotation ?? existingShape.rotation,
			isLocked: body.isLocked ?? existingShape.isLocked,
			opacity: body.opacity ?? existingShape.opacity,
			parentId: body.parentId ?? existingShape.parentId,
			index: body.index ?? existingShape.index,
			props,
		} as TLShape

		const success = await applyChangesToRoom(
			roomId,
			[
				{
					type: 'update',
					record: updatedShape,
				},
			],
			env
		)

		if (success) {
			return Response.json({
				success: true,
				shape: updatedShape,
			})
		} else {
			return Response.json({ error: 'Failed to update shape' }, { status: 500 })
		}
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

		// Verify shape exists first
		const records = await getRoomState(roomId, env)
		if (!records) {
			return Response.json({ error: 'Room not found' }, { status: 404 })
		}

		const existingShape = records[shapeId]
		if (!existingShape || existingShape.typeName !== 'shape') {
			return Response.json({ error: 'Shape not found' }, { status: 404 })
		}

		const success = await applyChangesToRoom(
			roomId,
			[
				{
					type: 'delete',
					recordId: shapeId,
				},
			],
			env
		)

		if (success) {
			return Response.json({
				deleted: true,
				id: shapeId,
			})
		} else {
			return Response.json({ error: 'Failed to delete shape' }, { status: 500 })
		}
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

		const records = await getRoomState(roomId, env)
		if (!records) {
			return Response.json({ error: 'Room not found' }, { status: 404 })
		}

		const shapes = Object.values(records || {}).filter((record: any) => record.typeName === 'shape')

		return Response.json({
			id: roomId,
			name: `Room ${roomId}`,
			shapeCount: shapes.length,
			created: '2025-10-25T10:00:00Z',
		})
	} catch (error) {
		console.error('Error getting room:', error)
		return Response.json({ error: 'Failed to get room', code: 'INTERNAL_ERROR' }, { status: 500 })
	}
}
