// Import pure functions from shared module
import { interpolateBuffValue, computeBuffDamage } from './lib/buffCalculations.js';

// Global variables
let charactersData = [];
let filteredData = [];
let sortColumn = null;
let sortDirection = 'asc';
let selectedTrait = '';
let selectedDamageType = '';
let searchQuery = '';
let selectedCharacters = [];
let characterBuffsData = []; // Store buffs affecting each character in the graph
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

        selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCharacterSelection(character);
        });
        selectCell.appendChild(selectBtn);
        row.appendChild(selectCell);

        const portraitCell = document.createElement('td');
        const portraitAlliance = character.grand_alliance || 'None';
        portraitCell.className = `portrait-cell portrait-${portraitAlliance.toLowerCase().replace(/\s+/g, '-')}`;
        portraitCell.style.cursor = 'pointer';
        const img = document.createElement('img');
        img.src = character.portrait_url || 'placeholder.png';
        img.alt = character.name || 'Character';
        img.className = 'portrait';
        img.onerror = function() {
            this.src = 'https://placehold.co/60x60?text=No+Image';
        };
        portraitCell.appendChild(img);
        portraitCell.addEventListener('click', () => showUnitBuffPopup(character));
        row.appendChild(portraitCell);

        const nameCell = document.createElement('td');
        nameCell.className = 'name-cell';
        nameCell.style.cursor = 'pointer';
        nameCell.textContent = character.name || 'Unknown';
        nameCell.addEventListener('click', () => showUnitBuffPopup(character));
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

// Make toggleCharacterSelection available globally for onclick handlers
window.toggleCharacterSelection = toggleCharacterSelection;

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
const BUFF_LEVEL = 37; // Hardcoded level for buff calculations

function renderSynergyGraph() {
    const container = document.getElementById('synergyGraph');

    // Clear and create Cytoscape container with overlay for images
    container.innerHTML = '<div id="cy"></div><div id="node-overlays"></div>';

    // Build nodes and edges for Cytoscape
    const elements = [];

    // Track buffs affecting each character
    const characterBuffs = selectedCharacters.map(() => []);

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
                allianceColor: allianceColor,
                characterIndex: index
            }
        });
    });

    // Add edges (arrows) based on buffs
    selectedCharacters.forEach((sourceChar, sourceIndex) => {
        if (!sourceChar.buffs || sourceChar.buffs.length === 0) {
            return;
        }

        selectedCharacters.forEach((targetChar, targetIndex) => {
            if (sourceIndex === targetIndex) return; // Don't draw arrow to self

            // Collect all matching buffs for this source-target pair
            const matchingBuffs = [];

            sourceChar.buffs.forEach(buff => {
                if (!buff.affects) return;

                const affectsGrandAlliance = buff.affects.grand_alliance || [];
                const affectsFaction = buff.affects.faction || [];
                const affectsTraits = buff.affects.traits || [];
                const affectsDamageTypes = buff.affects.damage_types || [];

                let matches = false;
                let isUniversal = false;
                let specificity = 0; // Higher values = more specific

                // Check for universal buff (*)
                if (affectsGrandAlliance.includes('*') || affectsFaction.includes('*')) {
                    matches = true;
                    isUniversal = true;
                    specificity = 0; // Universal is least specific
                }
                // Check faction match (most specific)
                else if (affectsFaction.includes(targetChar.faction)) {
                    matches = true;
                    specificity = 3;
                }
                // Check grand alliance match
                else if (affectsGrandAlliance.includes(targetChar.grand_alliance)) {
                    matches = true;
                    specificity = 2;
                }
                // Check trait match - target must have at least one of the traits
                else if (affectsTraits.length > 0 && targetChar.traits) {
                    const hasMatchingTrait = affectsTraits.some(trait =>
                        targetChar.traits.includes(trait)
                    );
                    if (hasMatchingTrait) {
                        matches = true;
                        specificity = 1;
                    }
                }
                // Check damage type match - target must have at least one of the damage types
                else if (affectsDamageTypes.length > 0 && targetChar.damage_types) {
                    const hasMatchingDamageType = affectsDamageTypes.some(damageType =>
                        targetChar.damage_types.includes(damageType)
                    );
                    if (hasMatchingDamageType) {
                        matches = true;
                        specificity = 1;
                    }
                }

                if (matches) {
                    matchingBuffs.push({
                        buff: buff,
                        isUniversal: isUniversal,
                        specificity: specificity,
                        isTraitBuff: affectsTraits.length > 0
                    });
                }
            });

            // Group buffs by name and select the most specific version of each
            const buffsByName = {};
            matchingBuffs.forEach(buffInfo => {
                const name = buffInfo.buff.name;
                if (!buffsByName[name] || buffInfo.specificity > buffsByName[name].specificity) {
                    buffsByName[name] = buffInfo;
                }
            });

            // Create edges and store buff info for the selected buffs
            Object.values(buffsByName).forEach(buffInfo => {
                const buff = buffInfo.buff;
                const edgeColor = buffInfo.isUniversal ? '#d4af37' : getAllianceColorForGraph(sourceChar.grand_alliance);
                const edgeWidth = buffInfo.isUniversal ? 4 : 2;

                // Build label with omit information
                let label = buff.name;
                if (buff.omit === 'non-normal') {
                    label += '\n(normal attacks)';
                } else if (buff.omit === 'normal') {
                    label += '\n(non-normal attacks)';
                }

                // Store buff info for the affected character
                characterBuffs[targetIndex].push({
                    buffName: buff.name,
                    sourceName: sourceChar.name,
                    effect: buff.effect,
                    omit: buff.omit
                });

                elements.push({
                    data: {
                        id: `edge-${sourceIndex}-${targetIndex}-${buff.name}`,
                        source: `node-${sourceIndex}`,
                        target: `node-${targetIndex}`,
                        label: label,
                        isUniversal: buffInfo.isUniversal,
                        isTraitBuff: buffInfo.isTraitBuff
                    },
                    style: {
                        'line-color': edgeColor,
                        'target-arrow-color': edgeColor,
                        'width': edgeWidth
                    }
                });
            });
        });
    });

    // Store globally for overlay rendering
    characterBuffsData = characterBuffs;

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
                    'font-size': 9,
                    'color': '#ffffff',
                    'text-background-color': '#000000',
                    'text-background-opacity': 0.9,
                    'text-background-padding': 4,
                    'text-rotation': 'autorotate',
                    'text-wrap': 'wrap',
                    'text-max-width': 120
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
            name: 'preset' // Use preset initially, we'll run layout explicitly
        },
        userZoomingEnabled: false,
        userPanningEnabled: true,
        boxSelectionEnabled: false,
        zoom: 1,
        pan: { x: 0, y: 0 },
        minZoom: 1,
        maxZoom: 1
    });

    // Set fixed zoom level and position graph to the left
    cy.zoom(1);

    // Run the layout explicitly so we can handle the stop event properly
    const layout = cy.layout({
        name: 'breadthfirst',
        directed: true,
        spacingFactor: 1.3,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: true,
        animate: true,
        animationDuration: 500,
        align: 'UL'
    });

    layout.on('layoutstop', function() {
        // Update overlays after layout animation completes
        const extent = cy.elements().boundingBox();
        cy.pan({ x: -extent.x1 + 50, y: -extent.y1 + 50 });
        updateNodeImageOverlays();
    });

    layout.run();

    // Update overlays when graph is panned or zoomed
    cy.on('pan zoom resize', function() {
        updateNodeImageOverlays();
    });

    // Update overlays when nodes are dragged
    cy.on('drag', 'node', function() {
        updateNodeImageOverlays();
    });
}

/**
 * Renders the buff table HTML from computed buff damage data.
 * @param {Object} buffData - The computed buff damage object from computeBuffDamage
 * @param {number} width - The minimum width for the table
 * @returns {HTMLElement|null} The buff table element or null if no data
 */
function renderBuffTable(buffData, width) {
    const { hasMelee, hasRange, meleeHits, rangeHits, buffRows, totals } = buffData;

    if (buffRows.length === 0) {
        return null;
    }

    const buffTable = document.createElement('div');
    buffTable.style.marginTop = '8px';
    buffTable.style.background = 'rgba(0, 0, 0, 0.9)';
    buffTable.style.border = '1px solid #667eea';
    buffTable.style.borderRadius = '4px';
    buffTable.style.padding = '8px';
    buffTable.style.fontSize = '11px';
    buffTable.style.color = '#d4af37';
    buffTable.style.minWidth = `${width}px`;
    buffTable.style.whiteSpace = 'nowrap';

    let tableHTML = '<table style="width: 100%; border-collapse: collapse;">';
    tableHTML += '<tr style="border-bottom: 1px solid #444;">';
    tableHTML += '<th style="text-align: left; padding: 5px; font-size: 13px;">Buff</th>';
    if (hasMelee) {
        tableHTML += '<th style="text-align: center; padding: 5px; font-size: 13px;">M</th>';
    }
    if (hasRange) {
        tableHTML += '<th style="text-align: center; padding: 5px; font-size: 13px;">R</th>';
    }
    tableHTML += '<th style="text-align: right; padding: 5px; font-size: 13px;">Buff@37</th>';
    if (hasMelee) {
        tableHTML += '<th style="text-align: right; padding: 5px; font-size: 13px;">Buffed M</th>';
    }
    if (hasRange) {
        tableHTML += '<th style="text-align: right; padding: 5px; font-size: 13px;">Buffed R</th>';
    }
    tableHTML += '</tr>';

    // Render buff rows
    buffRows.forEach(row => {
        const valueColor = row.isBonus ? '#6bff6b' : '#ff6b6b';
        const buffedColor = row.isBonus ? '#8fff8f' : (row.isBonus ? '#8fff8f' : null);

        tableHTML += '<tr>';
        tableHTML += `<td style="padding: 5px; font-size: 12px;">${row.name}</td>`;
        if (hasMelee) {
            tableHTML += `<td style="text-align: center; padding: 5px; font-size: 12px; color: #ffa500;">${meleeHits}</td>`;
        }
        if (hasRange) {
            tableHTML += `<td style="text-align: center; padding: 5px; font-size: 12px; color: #00bfff;">${rangeHits}</td>`;
        }
        tableHTML += `<td style="text-align: right; padding: 5px; font-size: 13px; font-weight: bold; color: ${valueColor};">${row.value}</td>`;
        if (hasMelee) {
            const meleeColor = row.isBonus ? '#8fff8f' : '#ffb366';
            tableHTML += `<td style="text-align: right; padding: 5px; font-size: 13px; font-weight: bold; color: ${meleeColor};">${row.buffedMelee}</td>`;
        }
        if (hasRange) {
            const rangeColor = row.isBonus ? '#8fff8f' : '#66d9ff';
            tableHTML += `<td style="text-align: right; padding: 5px; font-size: 13px; font-weight: bold; color: ${rangeColor};">${row.buffedRange}</td>`;
        }
        tableHTML += '</tr>';
    });

    // Add summary row
    if (totals.damage > 0 || totals.bonus > 0) {
        tableHTML += '<tr style="border-top: 2px solid #d4af37;">';
        tableHTML += '<td style="padding: 5px; font-size: 13px; font-weight: bold; color: #d4af37;">Total</td>';
        if (hasMelee) {
            tableHTML += `<td style="text-align: center; padding: 5px; font-size: 12px; color: #ffa500;">${meleeHits}</td>`;
        }
        if (hasRange) {
            tableHTML += `<td style="text-align: center; padding: 5px; font-size: 12px; color: #00bfff;">${rangeHits}</td>`;
        }
        tableHTML += '<td style="text-align: right; padding: 5px; font-size: 14px; font-weight: bold; color: #ffd700;">';
        if (totals.damage > 0 && totals.bonus > 0) {
            tableHTML += `${totals.damage} + ${totals.bonus}`;
        } else if (totals.damage > 0) {
            tableHTML += `${totals.damage}`;
        } else {
            tableHTML += `${totals.bonus}`;
        }
        tableHTML += '</td>';
        if (hasMelee) {
            tableHTML += '<td style="text-align: right; padding: 5px; font-size: 14px; font-weight: bold; color: #ffd700;">';
            if (totals.buffedMelee > 0 && totals.buffedBonusMelee > 0) {
                tableHTML += `${totals.buffedMelee} + ${totals.buffedBonusMelee}`;
            } else if (totals.buffedMelee > 0) {
                tableHTML += `${totals.buffedMelee}`;
            } else if (totals.buffedBonusMelee > 0) {
                tableHTML += `${totals.buffedBonusMelee}`;
            } else {
                tableHTML += '0';
            }
            tableHTML += '</td>';
        }
        if (hasRange) {
            tableHTML += '<td style="text-align: right; padding: 5px; font-size: 14px; font-weight: bold; color: #ffd700;">';
            if (totals.buffedRange > 0 && totals.buffedBonusRange > 0) {
                tableHTML += `${totals.buffedRange} + ${totals.buffedBonusRange}`;
            } else if (totals.buffedRange > 0) {
                tableHTML += `${totals.buffedRange}`;
            } else if (totals.buffedBonusRange > 0) {
                tableHTML += `${totals.buffedBonusRange}`;
            } else {
                tableHTML += '0';
            }
            tableHTML += '</td>';
        }
        tableHTML += '</tr>';
    }

    tableHTML += '</table>';
    buffTable.innerHTML = tableHTML;
    return buffTable;
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
        const charIndex = data.characterIndex;

        // Create wrapper for image and buff table
        const wrapper = document.createElement('div');
        wrapper.style.position = 'absolute';
        wrapper.style.left = `${position.x - width/2}px`;
        wrapper.style.top = `${position.y - height/2}px`;
        wrapper.style.pointerEvents = 'none';

        // Create image element
        const imgWrapper = document.createElement('div');
        imgWrapper.style.width = `${width}px`;
        imgWrapper.style.height = `${height}px`;
        imgWrapper.style.borderRadius = '8px';
        imgWrapper.style.overflow = 'hidden';

        const img = document.createElement('img');
        img.src = data.portrait;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.display = 'block';

        imgWrapper.appendChild(img);
        wrapper.appendChild(imgWrapper);

        // Add buff table if this character receives buffs
        if (charIndex !== undefined && characterBuffsData[charIndex] && characterBuffsData[charIndex].length > 0) {
            const char = selectedCharacters[charIndex];
            const buffData = computeBuffDamage(char, characterBuffsData[charIndex], BUFF_LEVEL);
            const buffTable = renderBuffTable(buffData, width);
            if (buffTable) {
                wrapper.appendChild(buffTable);
            }
        }

        overlayContainer.appendChild(wrapper);
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

    // Setup popup close handlers
    setupPopupHandlers();
}

/**
 * Setup popup close handlers
 */
function setupPopupHandlers() {
    const popup = document.getElementById('unitPopup');
    const closeBtn = document.getElementById('closePopup');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            popup.style.display = 'none';
        });
    }

    if (popup) {
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.style.display = 'none';
            }
        });
    }

    // Close popup on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && popup && popup.style.display !== 'none') {
            popup.style.display = 'none';
        }
    });
}

/**
 * Computes all units that can buff the target character
 * @param {Object} targetChar - The character to check buffs for
 * @param {Array} allUnits - All available units
 * @returns {Array} Array of { sourceChar, buffs: [...], buffData }
 */
function computeAllIncomingBuffs(targetChar, allUnits) {
    const incoming = [];

    allUnits.forEach(sourceChar => {
        if (sourceChar.name === targetChar.name) return; // Skip self
        if (!sourceChar.buffs || sourceChar.buffs.length === 0) return;

        const matchingBuffs = [];

        sourceChar.buffs.forEach(buff => {
            if (!buff.affects) return;

            const affectsGrandAlliance = buff.affects.grand_alliance || [];
            const affectsFaction = buff.affects.faction || [];
            const affectsTraits = buff.affects.traits || [];
            const affectsDamageTypes = buff.affects.damage_types || [];

            let matches = false;
            let specificity = 0;

            if (affectsGrandAlliance.includes('*') || affectsFaction.includes('*')) {
                matches = true;
                specificity = 0;
            } else if (affectsFaction.includes(targetChar.faction)) {
                matches = true;
                specificity = 3;
            } else if (affectsGrandAlliance.includes(targetChar.grand_alliance)) {
                matches = true;
                specificity = 2;
            } else if (affectsTraits.length > 0 && targetChar.traits) {
                const hasMatchingTrait = affectsTraits.some(trait => targetChar.traits.includes(trait));
                if (hasMatchingTrait) {
                    matches = true;
                    specificity = 1;
                }
            } else if (affectsDamageTypes.length > 0 && targetChar.damage_types) {
                const hasMatchingDamageType = affectsDamageTypes.some(dt => targetChar.damage_types.includes(dt));
                if (hasMatchingDamageType) {
                    matches = true;
                    specificity = 1;
                }
            }

            if (matches) {
                matchingBuffs.push({
                    buff: buff,
                    specificity: specificity
                });
            }
        });

        // Group by name and select most specific
        const buffsByName = {};
        matchingBuffs.forEach(buffInfo => {
            const name = buffInfo.buff.name;
            if (!buffsByName[name] || buffInfo.specificity > buffsByName[name].specificity) {
                buffsByName[name] = buffInfo;
            }
        });

        const selectedBuffs = Object.values(buffsByName).map(bi => ({
            buffName: bi.buff.name,
            sourceName: sourceChar.name,
            effect: bi.buff.effect,
            omit: bi.buff.omit
        }));

        if (selectedBuffs.length > 0) {
            const buffData = computeBuffDamage(targetChar, selectedBuffs, BUFF_LEVEL);
            incoming.push({
                sourceChar: sourceChar,
                buffs: selectedBuffs,
                buffData: buffData
            });
        }
    });

    // Sort by cumulative buffed damage (melee + range, highest first)
    incoming.sort((a, b) => {
        const aTotals = a.buffData.totals;
        const bTotals = b.buffData.totals;
        const aTotal = (aTotals.buffedMelee || 0) + (aTotals.buffedBonusMelee || 0) + 
                       (aTotals.buffedRange || 0) + (aTotals.buffedBonusRange || 0);
        const bTotal = (bTotals.buffedMelee || 0) + (bTotals.buffedBonusMelee || 0) + 
                       (bTotals.buffedRange || 0) + (bTotals.buffedBonusRange || 0);
        return bTotal - aTotal;
    });

    return incoming;
}

/**
 * Computes all units that the source character can buff
 * @param {Object} sourceChar - The character providing buffs
 * @param {Array} allUnits - All available units
 * @returns {Array} Array of { targetChar, buffs: [...], buffData }
 */
function computeAllOutgoingBuffs(sourceChar, allUnits) {
    const outgoing = [];

    if (!sourceChar.buffs || sourceChar.buffs.length === 0) {
        return outgoing;
    }

    allUnits.forEach(targetChar => {
        if (targetChar.name === sourceChar.name) return; // Skip self

        const matchingBuffs = [];

        sourceChar.buffs.forEach(buff => {
            if (!buff.affects) return;

            const affectsGrandAlliance = buff.affects.grand_alliance || [];
            const affectsFaction = buff.affects.faction || [];
            const affectsTraits = buff.affects.traits || [];
            const affectsDamageTypes = buff.affects.damage_types || [];

            let matches = false;
            let specificity = 0;

            if (affectsGrandAlliance.includes('*') || affectsFaction.includes('*')) {
                matches = true;
                specificity = 0;
            } else if (affectsFaction.includes(targetChar.faction)) {
                matches = true;
                specificity = 3;
            } else if (affectsGrandAlliance.includes(targetChar.grand_alliance)) {
                matches = true;
                specificity = 2;
            } else if (affectsTraits.length > 0 && targetChar.traits) {
                const hasMatchingTrait = affectsTraits.some(trait => targetChar.traits.includes(trait));
                if (hasMatchingTrait) {
                    matches = true;
                    specificity = 1;
                }
            } else if (affectsDamageTypes.length > 0 && targetChar.damage_types) {
                const hasMatchingDamageType = affectsDamageTypes.some(dt => targetChar.damage_types.includes(dt));
                if (hasMatchingDamageType) {
                    matches = true;
                    specificity = 1;
                }
            }

            if (matches) {
                matchingBuffs.push({
                    buff: buff,
                    specificity: specificity
                });
            }
        });

        // Group by name and select most specific
        const buffsByName = {};
        matchingBuffs.forEach(buffInfo => {
            const name = buffInfo.buff.name;
            if (!buffsByName[name] || buffInfo.specificity > buffsByName[name].specificity) {
                buffsByName[name] = buffInfo;
            }
        });

        const selectedBuffs = Object.values(buffsByName).map(bi => ({
            buffName: bi.buff.name,
            sourceName: sourceChar.name,
            effect: bi.buff.effect,
            omit: bi.buff.omit
        }));

        if (selectedBuffs.length > 0) {
            const buffData = computeBuffDamage(targetChar, selectedBuffs, BUFF_LEVEL);
            outgoing.push({
                targetChar: targetChar,
                buffs: selectedBuffs,
                buffData: buffData
            });
        }
    });

    // Sort by cumulative buffed damage (melee + range, highest first)
    outgoing.sort((a, b) => {
        const aTotals = a.buffData.totals;
        const bTotals = b.buffData.totals;
        const aTotal = (aTotals.buffedMelee || 0) + (aTotals.buffedBonusMelee || 0) + 
                       (aTotals.buffedRange || 0) + (aTotals.buffedBonusRange || 0);
        const bTotal = (bTotals.buffedMelee || 0) + (bTotals.buffedBonusMelee || 0) + 
                       (bTotals.buffedRange || 0) + (bTotals.buffedBonusRange || 0);
        return bTotal - aTotal;
    });

    return outgoing;
}

/**
 * Renders a buff card for the popup
 * @param {Object} otherChar - The other character (source or target)
 * @param {Array} buffs - The buff info array
 * @param {Object} buffData - Computed buff damage data
 * @param {string} direction - 'from' or 'to'
 * @returns {string} HTML string for the buff card
 */
function renderBuffCard(otherChar, buffs, buffData, direction) {
    const { hasMelee, hasRange, totals } = buffData;
    const buffNames = buffs.map(b => b.buffName).join(', ');
    
    let statsHTML = '';
    
    // Show buff value
    if (totals.damage > 0 || totals.bonus > 0) {
        statsHTML += `
            <div class="unit-popup-stat">
                <span class="unit-popup-stat-label">Buff</span>
                <span class="unit-popup-stat-value">${totals.damage}${totals.bonus > 0 ? '+' + totals.bonus : ''}</span>
            </div>
        `;
    }
    
    // Show melee buffed damage
    if (hasMelee && (totals.buffedMelee > 0 || totals.buffedBonusMelee > 0)) {
        const meleeVal = totals.buffedMelee + (totals.buffedBonusMelee || 0);
        statsHTML += `
            <div class="unit-popup-stat">
                <span class="unit-popup-stat-label">Melee</span>
                <span class="unit-popup-stat-value melee">${meleeVal}</span>
            </div>
        `;
    }
    
    // Show range buffed damage
    if (hasRange && (totals.buffedRange > 0 || totals.buffedBonusRange > 0)) {
        const rangeVal = totals.buffedRange + (totals.buffedBonusRange || 0);
        statsHTML += `
            <div class="unit-popup-stat">
                <span class="unit-popup-stat-label">Range</span>
                <span class="unit-popup-stat-value range">${rangeVal}</span>
            </div>
        `;
    }

    return `
        <div class="unit-popup-buff-card">
            <div class="unit-popup-buff-header">
                <img class="unit-popup-buff-portrait" src="${otherChar.portrait_url}" alt="${otherChar.name}">
                <div class="unit-popup-buff-info">
                    <div class="unit-popup-buff-name">${otherChar.name}</div>
                    <div class="unit-popup-buff-details">${buffNames}</div>
                </div>
                <div class="unit-popup-buff-stats">
                    ${statsHTML}
                </div>
            </div>
        </div>
    `;
}

/**
 * Shows the unit buff details popup
 * @param {Object} character - The character to show buff details for
 */
function showUnitBuffPopup(character) {
    const popup = document.getElementById('unitPopup');
    const portrait = document.getElementById('popupPortrait');
    const name = document.getElementById('popupName');
    const faction = document.getElementById('popupFaction');
    const incomingContainer = document.getElementById('popupIncomingBuffs');
    const outgoingContainer = document.getElementById('popupOutgoingBuffs');
    const incomingCount = document.getElementById('incomingCount');
    const outgoingCount = document.getElementById('outgoingCount');

    // Set header info
    portrait.src = character.portrait_url || 'https://placehold.co/80x80?text=No+Image';
    portrait.alt = character.name;
    name.textContent = character.name;
    faction.textContent = `${character.faction} • ${character.grand_alliance || 'Unknown Alliance'}`;

    // Compute incoming buffs from ALL units
    const incomingBuffs = computeAllIncomingBuffs(character, charactersData);
    incomingCount.textContent = `(${incomingBuffs.length})`;
    
    if (incomingBuffs.length === 0) {
        incomingContainer.innerHTML = '<p class="unit-popup-no-buffs">No units can buff this character.</p>';
    } else {
        let incomingHTML = '';
        incomingBuffs.forEach(({ sourceChar, buffs, buffData }) => {
            incomingHTML += renderBuffCard(sourceChar, buffs, buffData, 'from');
        });
        incomingContainer.innerHTML = incomingHTML;
    }

    // Compute outgoing buffs to ALL units
    const outgoingBuffs = computeAllOutgoingBuffs(character, charactersData);
    outgoingCount.textContent = `(${outgoingBuffs.length})`;
    
    if (outgoingBuffs.length === 0) {
        outgoingContainer.innerHTML = '<p class="unit-popup-no-buffs">This character cannot buff any other units.</p>';
    } else {
        let outgoingHTML = '';
        outgoingBuffs.forEach(({ targetChar, buffs, buffData }) => {
            outgoingHTML += renderBuffCard(targetChar, buffs, buffData, 'to');
        });
        outgoingContainer.innerHTML = outgoingHTML;
    }

    popup.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', loadCharacters);
