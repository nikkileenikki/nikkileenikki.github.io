# Layer Grouping Implementation Plan

## Overview
Implement layer grouping with multi-select, group creation, and drag-in/out functionality.

## Implementation Steps

### 1. Data Structure
```javascript
// Already added:
let selectedElements = []; // Track multiple selections
let groupCounter = 0;

// Group structure:
groups = [
    {
        id: 'group_1',
        name: 'Group 1',
        elementIds: ['element_1', 'element_2'],
        expanded: true,
        zIndex: 10
    }
]

// Element structure update:
element.groupId = 'group_1' or null;
```

### 2. Multi-Select Implementation
- Ctrl/Cmd+Click: Toggle selection
- Shift+Click: Range selection
- Update handleLayerClick to support multi-select
- Visual feedback: highlight multiple selected layers

### 3. Create Group Button
- Add button with folder icon in layers section
- Groups selected layers when clicked
- Prompt for group name
- Creates new group with selected elements

### 4. Group Display
- Show groups with folder icon
- Collapsible/expandable groups
- Indent grouped elements
- Show element count in group

### 5. Drag & Drop
- Drag element onto group: Add to group
- Drag element out of group: Remove from group  
- Drag to reorder within group
- Drag entire group to reorder

### 6. Group Operations
- Rename group
- Delete group (ungroup elements)
- Select all in group
- Collapse/expand group

## Code Locations
- State: Line 8-10 in app.js
- updateLayersList: Line 1281 in app.js
- Layer click handler: Line 188 in app.js
- Drag handlers: Search for "handleDragStart"

## UI Additions Needed
- Create Group button in layers section
- Group header template in updateLayersList
- Multi-select styling
- Context menu for group operations
