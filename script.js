// Global variables
let charactersData = [];
let filteredData = [];
let sortColumn = null;
let sortDirection = 'asc';
let selectedTrait = '';
let selectedDamageType = '';
let searchQuery = '';
let selectedCharacters = [];
const MAX_SQUAD_SIZE = 5;

// Load and initialize the table
async function loadCharacters() {
    try {
        const response = await fetch('data/units.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        charactersData = await response.json();
        filteredData = [...charactersData];
        
        document.getElementById('loading').style.display = 'none';
        populateTraitFilter();
        populateDamageTypeFilter();
        renderTable(filteredData);
        setupSortHandlers();
        setupFilterHandlers();
        setupSquadHandlers();
    } catch (error) {
        console.error('Error loading character data:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
    }
}

function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    data.forEach(character => {
        const row = document.createElement('tr');
        
        // Select button cell
        const selectCell = document.createElement('td');
        selectCell.style.textAlign = 'center';
        const selectBtn = document.createElement('button');
        selectBtn.className = 'select-btn';
        const isSelected = selectedCharacters.some(c => c.name === character.name);
        const isMaxReached = selectedCharacters.length >= MAX_SQUAD_SIZE;
        
        if (isSelected) {
            selectBtn.textContent = 'Selected';
            selectBtn.classList.add('selected');
        } else {
            selectBtn.textContent = 'Select';
            if (isMaxReached) {
                selectBtn.disabled = true;
            }
        }
        
        selectBtn.addEventListener('click', () => toggleCharacterSelection(character));
        selectCell.appendChild(selectBtn);
        row.appendChild(selectCell);
        
        const portraitCell = document.createElement('td');
        const portraitAlliance = character.grand_alliance || 'None';
        portraitCell.className = `portrait-cell portrait-${portraitAlliance.toLowerCase().replace(/\s+/g, '-')}`;
        const img = document.createElement('img');
        img.src = character.portrait_url || 'placeholder.png';
        img.alt = character.name || 'Character';
        img.className = 'portrait';
        img.onerror = function() {
            this.src = 'https://via.placeholder.com/60x60?text=No+Image';
        };
        portraitCell.appendChild(img);
        row.appendChild(portraitCell);
        
        const nameCell = document.createElement('td');
        nameCell.className = 'name-cell';
        nameCell.textContent = character.name || 'Unknown';
        row.appendChild(nameCell);
        
        const factionCell = document.createElement('td');
        factionCell.className = 'faction-cell';
        factionCell.textContent = character.faction || 'Unknown';
        row.appendChild(factionCell);
        
        const damageCell = document.createElement('td');
        const damageTypesDiv = document.createElement('div');
        damageTypesDiv.className = 'damage-types';
        if (character.damage_types && Array.isArray(character.damage_types)) {
            character.damage_types.forEach(type => {
                const badge = document.createElement('span');
                badge.className = 'badge damage-badge';
                badge.textContent = type;
                damageTypesDiv.appendChild(badge);
            });
        }
        damageCell.appendChild(damageTypesDiv);
        row.appendChild(damageCell);
        
        const traitsCell = document.createElement('td');
        const traitsDiv = document.createElement('div');
        traitsDiv.className = 'traits';
        if (character.traits && Array.isArray(character.traits)) {
            character.traits.forEach(trait => {
                const badge = document.createElement('span');
                badge.className = 'badge trait-badge';
                badge.textContent = trait;
                traitsDiv.appendChild(badge);
            });
        }
        traitsCell.appendChild(traitsDiv);
        row.appendChild(traitsCell);
        
        const statsCell = document.createElement('td');
        const statsGrid = document.createElement('div');
        statsGrid.className = 'stats-grid';
        if (character.stats && typeof character.stats === 'object') {
            for (const [key, value] of Object.entries(character.stats)) {
                const statItem = document.createElement('div');
                statItem.className = 'stat-item';
                const label = document.createElement('span');
                label.className = 'stat-label';
                label.textContent = key + ':';
                const valueSpan = document.createElement('span');
                valueSpan.className = 'stat-value';
                valueSpan.textContent = value;
                statItem.appendChild(label);
                statItem.appendChild(valueSpan);
                statsGrid.appendChild(statItem);
            }
        }
        statsCell.appendChild(statsGrid);
        row.appendChild(statsCell);
        
        const allianceCell = document.createElement('td');
        const alliance = character.grand_alliance || 'None';
        const allianceSpan = document.createElement('span');
        allianceSpan.className = `alliance-cell alliance-${alliance.toLowerCase().replace(/\s+/g, '-')}`;
        allianceSpan.textContent = alliance;
        allianceCell.appendChild(allianceSpan);
        row.appendChild(allianceCell);
        
        tbody.appendChild(row);
    });
}

function setupSortHandlers() {
    const sortableHeaders = document.querySelectorAll('th.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const column = this.getAttribute('data-column');
            if (sortColumn === column) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = column;
                sortDirection = 'asc';
            }
            sortableHeaders.forEach(h => h.classList.remove('asc', 'desc'));
            this.classList.add(sortDirection);
            sortData(column, sortDirection);
            renderTable(filteredData);
        });
    });
}

function populateTraitFilter() {
    const traitSet = new Set();
    charactersData.forEach(character => {
        if (character.traits && Array.isArray(character.traits)) {
            character.traits.forEach(trait => traitSet.add(trait));
        }
    });
    const traitFilter = document.getElementById('traitFilter');
    const sortedTraits = Array.from(traitSet).sort();
    sortedTraits.forEach(trait => {
        const option = document.createElement('option');
        option.value = trait;
        option.textContent = trait;
        traitFilter.appendChild(option);
    });
}

function populateDamageTypeFilter() {
    const damageTypeSet = new Set();
    charactersData.forEach(character => {
        if (character.damage_types && Array.isArray(character.damage_types)) {
            character.damage_types.forEach(type => damageTypeSet.add(type));
        }
    });
    const damageTypeFilter = document.getElementById('damageTypeFilter');
    const sortedDamageTypes = Array.from(damageTypeSet).sort();
    sortedDamageTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        damageTypeFilter.appendChild(option);
    });
}

function setupFilterHandlers() {
    const traitFilter = document.getElementById('traitFilter');
    const damageTypeFilter = document.getElementById('damageTypeFilter');
    const searchBox = document.getElementById('searchBox');
    const clearButton = document.getElementById('clearFilters');
    
    traitFilter.addEventListener('change', function() {
        selectedTrait = this.value;
        applyFilters();
    });
    
    damageTypeFilter.addEventListener('change', function() {
        selectedDamageType = this.value;
        applyFilters();
    });
    
    searchBox.addEventListener('input', function() {
        searchQuery = this.value.toLowerCase();
        applyFilters();
    });
    
    clearButton.addEventListener('click', function() {
        traitFilter.value = '';
        damageTypeFilter.value = '';
        searchBox.value = '';
        selectedTrait = '';
        selectedDamageType = '';
        searchQuery = '';
        applyFilters();
    });
}

function applyFilters() {
    filteredData = charactersData.filter(character => {
        // Filter by search query (name, faction, or alliance - starts with)
        if (searchQuery) {
            const name = (character.name || '').toLowerCase();
            const faction = (character.faction || '').toLowerCase();
            const alliance = (character.grand_alliance || '').toLowerCase();
            
            const matchesSearch = name.startsWith(searchQuery) || 
                                  faction.startsWith(searchQuery) || 
                                  alliance.startsWith(searchQuery);
            
            if (!matchesSearch) {
                return false;
            }
        }
        
        // Filter by trait
        if (selectedTrait) {
            if (!character.traits || !character.traits.includes(selectedTrait)) {
                return false;
            }
        }
        
        // Filter by damage type
        if (selectedDamageType) {
            if (!character.damage_types || !character.damage_types.includes(selectedDamageType)) {
                return false;
            }
        }
        
        return true;
    });
    updateFilterInfo();
    if (sortColumn) {
        sortData(sortColumn, sortDirection);
    }
    renderTable(filteredData);
}

function updateFilterInfo() {
    const filterInfo = document.getElementById('filterInfo');
    const filters = [];
    
    if (searchQuery) {
        filters.push(`search "${searchQuery}"`);
    }
    
    if (selectedTrait) {
        filters.push(`trait "${selectedTrait}"`);
    }
    
    if (selectedDamageType) {
        filters.push(`damage type "${selectedDamageType}"`);
    }
    
    if (filters.length > 0) {
        filterInfo.innerHTML = `<strong>Active Filter:</strong> Showing ${filteredData.length} character(s) with ${filters.join(' and ')}`;
        filterInfo.classList.add('active');
    } else {
        filterInfo.classList.remove('active');
    }
}

function sortData(column, direction) {
    filteredData.sort((a, b) => {
        let aValue = a[column];
        let bValue = b[column];
        if (aValue === undefined || aValue === null) aValue = '';
        if (bValue === undefined || bValue === null) bValue = '';
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();
        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

// Squad management functions
function toggleCharacterSelection(character) {
    const index = selectedCharacters.findIndex(c => c.name === character.name);
    
    if (index > -1) {
        // Remove character
        selectedCharacters.splice(index, 1);
    } else {
        // Add character if under limit
        if (selectedCharacters.length < MAX_SQUAD_SIZE) {
            selectedCharacters.push(character);
        }
    }
    
    updateSelectedSquadDisplay();
    renderTable(filteredData); // Re-render to update button states
}

function removeCharacterFromSquad(characterName) {
    const index = selectedCharacters.findIndex(c => c.name === characterName);
    if (index > -1) {
        selectedCharacters.splice(index, 1);
        updateSelectedSquadDisplay();
        renderTable(filteredData);
    }
}

function updateSelectedSquadDisplay() {
    const container = document.getElementById('selectedCharacters');
    const squadCountSpan = document.getElementById('squadCount');
    const clearButton = document.getElementById('clearSquad');
    const synergySection = document.getElementById('synergyGraphSection');
    
    squadCountSpan.textContent = `(${selectedCharacters.length}/${MAX_SQUAD_SIZE})`;
    
    if (selectedCharacters.length === 0) {
        container.innerHTML = '<p class="empty-squad-message">Select up to 5 characters to build your squad</p>';
        clearButton.style.display = 'none';
        synergySection.style.display = 'none';
        return;
    }
    
    clearButton.style.display = 'block';
    synergySection.style.display = 'block';
    
    container.innerHTML = selectedCharacters.map(char => `
        <div class="selected-character-card ${getAllianceClass(char.grand_alliance)}">
            <button class="remove-btn" onclick="toggleCharacterSelection(${JSON.stringify(char).replace(/"/g, '&quot;')})">×</button>
            <img src="${char.portrait_url}" alt="${char.name}" class="selected-character-image" title="${char.name} (${char.faction})">
        </div>
    `).join('');
    
    renderSynergyGraph();
}

let cy = null; // Store Cytoscape instance

function renderSynergyGraph() {
    const container = document.getElementById('synergyGraph');
    
    // Clear and create Cytoscape container with overlay for images
    container.innerHTML = '<div id="cy"></div><div id="node-overlays"></div>';
    
    // Build nodes and edges for Cytoscape
    const elements = [];
    
    // Add nodes
    selectedCharacters.forEach((char, index) => {
        const allianceColor = getAllianceColorForGraph(char.grand_alliance);
        console.log(`Node ${index}: ${char.name}, Portrait URL: ${char.portrait_url}`);
        elements.push({
            data: { 
                id: `node-${index}`, 
                label: char.name,
                faction: char.faction,
                alliance: char.grand_alliance,
                portrait: char.portrait_url,
                allianceColor: allianceColor
            }
        });
    });
    
    // Add edges (arrows) based on buffs
    selectedCharacters.forEach((sourceChar, sourceIndex) => {
        if (!sourceChar.buffs || sourceChar.buffs.length === 0) {
            return;
        }
        
        sourceChar.buffs.forEach(buff => {
            if (!buff.affects) return;
            
            const affectsGrandAlliance = buff.affects.grand_alliance || [];
            const affectsFaction = buff.affects.faction || [];
            const affectsTraits = buff.affects.traits || [];
            
            selectedCharacters.forEach((targetChar, targetIndex) => {
                if (sourceIndex === targetIndex) return; // Don't draw arrow to self
                
                let matches = false;
                let isUniversal = false;
                
                // Check for universal buff (*)
                if (affectsGrandAlliance.includes('*') || affectsFaction.includes('*')) {
                    matches = true;
                    isUniversal = true;
                }
                // Check grand alliance match
                else if (affectsGrandAlliance.includes(targetChar.grand_alliance)) {
                    matches = true;
                }
                // Check faction match
                else if (affectsFaction.includes(targetChar.faction)) {
                    matches = true;
                }
                // Check trait match - target must have at least one of the traits
                else if (affectsTraits.length > 0 && targetChar.traits) {
                    const hasMatchingTrait = affectsTraits.some(trait => 
                        targetChar.traits.includes(trait)
                    );
                    if (hasMatchingTrait) {
                        matches = true;
                    }
                }
                
                if (matches) {
                    const edgeColor = isUniversal ? '#d4af37' : getAllianceColorForGraph(sourceChar.grand_alliance);
                    const edgeWidth = isUniversal ? 4 : 2;
                    const isTraitBuff = affectsTraits.length > 0;
                    
                    elements.push({
                        data: {
                            id: `edge-${sourceIndex}-${targetIndex}-${buff.name}`,
                            source: `node-${sourceIndex}`,
                            target: `node-${targetIndex}`,
                            label: buff.name,
                            isUniversal: isUniversal,
                            isTraitBuff: isTraitBuff
                        },
                        style: {
                            'line-color': edgeColor,
                            'target-arrow-color': edgeColor,
                            'width': edgeWidth
                        }
                    });
                }
            });
        });
    });
    
    // Initialize Cytoscape
    if (cy) {
        cy.destroy();
    }
    
    cy = cytoscape({
        container: document.getElementById('cy'),
        elements: elements,
        style: [
            {
                selector: 'node',
                style: {
                    'label': '',
                    'width': 50,
                    'height': 50,
                    'background-color': '#1a1a2a',
                    'border-color': 'data(allianceColor)',
                    'border-width': 2,
                    'border-opacity': 1,
                    'shape': 'roundrectangle'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'curve-style': 'bezier',
                    'target-arrow-shape': 'triangle',
                    'arrow-scale': 1.5,
                    'opacity': 0.8,
                    'label': 'data(label)',
                    'font-size': 10,
                    'color': '#ffffff',
                    'text-background-color': '#000000',
                    'text-background-opacity': 0.8,
                    'text-background-padding': 3,
                    'text-rotation': 'autorotate'
                }
            },
            {
                selector: 'edge[?isUniversal]',
                style: {
                    'line-style': 'solid',
                    'width': 4
                }
            },
            {
                selector: 'edge[?isTraitBuff]',
                style: {
                    'line-style': 'dashed',
                    'line-dash-pattern': [6, 3]
                }
            }
        ],
        layout: {
            name: 'breadthfirst',
            directed: true,
            spacingFactor: 1.5,
            avoidOverlap: true,
            nodeDimensionsIncludeLabels: true,
            animate: true,
            animationDuration: 500
        },
        userZoomingEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: false
    });
    
    // Add tooltips on hover
    cy.on('mouseover', 'node', function(event) {
        const node = event.target;
        const data = node.data();
        node.style({
            'width': 70,
            'height': 70,
            'border-width': 3
        });
        updateNodeImageOverlays();
    });
    
    cy.on('mouseout', 'node', function(event) {
        const node = event.target;
        node.style({
            'width': 50,
            'height': 50,
            'border-width': 2
        });
        updateNodeImageOverlays();
    });
    
    // Create HTML overlays for images (to avoid CORS issues)
    updateNodeImageOverlays();
    
    // Update overlays when graph is panned or zoomed
    cy.on('pan zoom resize', function() {
        updateNodeImageOverlays();
    });
}

function updateNodeImageOverlays() {
    const overlayContainer = document.getElementById('node-overlays');
    if (!overlayContainer || !cy) return;
    
    overlayContainer.innerHTML = '';
    
    cy.nodes().forEach(node => {
        const position = node.renderedPosition();
        const width = node.renderedWidth();
        const height = node.renderedHeight();
        const data = node.data();
        
        // Create image element
        const imgWrapper = document.createElement('div');
        imgWrapper.style.position = 'absolute';
        imgWrapper.style.left = `${position.x - width/2}px`;
        imgWrapper.style.top = `${position.y - height/2}px`;
        imgWrapper.style.width = `${width}px`;
        imgWrapper.style.height = `${height}px`;
        imgWrapper.style.pointerEvents = 'none';
        imgWrapper.style.borderRadius = '8px';
        imgWrapper.style.overflow = 'hidden';
        
        const img = document.createElement('img');
        img.src = data.portrait;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.display = 'block';
        
        imgWrapper.appendChild(img);
        overlayContainer.appendChild(imgWrapper);
    });
}

function getAllianceColorForGraph(alliance) {
    const colors = {
        'Imperial': '#4a90e2',
        'Chaos': '#dc143c',
        'Xenos': '#9b59b6'
    };
    return colors[alliance] || '#667ee6';
}

function getAllianceClass(alliance) {
    if (!alliance) return '';
    const normalized = alliance.toLowerCase().replace(/\s+/g, '-');
    return `alliance-${normalized}`;
}

function getAllianceColor(alliance) {
    const colors = {
        'Imperial': '#fbbf24',
        'Chaos': '#8b0000',
        'Xenos': '#00ff88'
    };
    return colors[alliance] || 'rgba(102, 126, 234, 0.5)';
}

function setupSquadHandlers() {
    const clearSquadBtn = document.getElementById('clearSquad');
    clearSquadBtn.addEventListener('click', () => {
        selectedCharacters = [];
        updateSelectedSquadDisplay();
        renderTable(filteredData);
    });
}

document.addEventListener('DOMContentLoaded', loadCharacters);
