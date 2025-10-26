# TlDraw MCP Server

A Model Context Protocol (MCP) server for a drawing canvas


## Server Configuration

```yaml specscript
Mcp server:
  name: mcp-tldraw
  version: 1.0.0
  transport: SSE
  port: 5180
```

## Tools

Tools for manipualting the canvas

### List shapes

Retrieves all shapes.

```yaml specscript
Mcp tool:
  list_shapes:
    description: List all shapes
    inputSchema:
      type: object
      properties:
        room:
          type: string
          description: |
            The name of the 'room' or canvas that we are in.
            For example 'mcp-room' or 'project-whiteboard'
          default: mcp-room
    script: list-shapes.spec.yaml
```

### Create note

Creates a sticky note

```yaml specscript
Mcp tool:
  create_note:
    description: Creates a sticky note on the canvas with a text.
    inputSchema:
      type: object
      properties:
        room:
          type: string
          description: |
            The name of the 'room' or canvas that we are in.
            For example 'mcp-room' or 'project-whiteboard'
          default: mcp-room
        text:
          type: string
          description: |
            The text to put on the sticky note. 
            Just plain text, no formatting
        x:
          type: number
          description: |
            The x coordinate on where to place the note on the canvas. 
            Typically between 0 and 1000
        y:
          type: number
          description: |
            The y coordinate on where to place the note on the canvas. 
            Typically between 0 and 1000

      required: [text]
    script: create-note.spec.yaml

```
