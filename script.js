// Global variables
let charactersData = [];
let filteredData = [];
let sortColumn = null;
let sortDirection = 'asc';
let selectedTrait = '';
let selectedDamageType = '';
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
    const clearButton = document.getElementById('clearFilters');
    
    traitFilter.addEventListener('change', function() {
        selectedTrait = this.value;
        applyFilters();
    });
    
    damageTypeFilter.addEventListener('change', function() {
        selectedDamageType = this.value;
        applyFilters();
    });
    
    clearButton.addEventListener('click', function() {
        traitFilter.value = '';
        damageTypeFilter.value = '';
        selectedTrait = '';
        selectedDamageType = '';
        applyFilters();
    });
}

function applyFilters() {
    filteredData = charactersData.filter(character => {
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
    const squadCount = document.getElementById('squadCount');
    const clearSquadBtn = document.getElementById('clearSquad');
    
    squadCount.textContent = `(${selectedCharacters.length}/${MAX_SQUAD_SIZE})`;
    
    if (selectedCharacters.length === 0) {
        container.innerHTML = '<p class="empty-squad-message">Select up to 5 characters to build your squad</p>';
        clearSquadBtn.style.display = 'none';
    } else {
        container.innerHTML = '';
        clearSquadBtn.style.display = 'inline-block';
        
        selectedCharacters.forEach(character => {
            const card = document.createElement('div');
            card.className = 'selected-character-card';
            
            const alliance = character.grand_alliance || 'None';
            card.style.borderColor = getAllianceColor(alliance);
            
            const img = document.createElement('img');
            img.src = character.portrait_url || 'placeholder.png';
            img.alt = character.name || 'Character';
            img.className = 'portrait';
            img.onerror = function() {
                this.src = 'https://via.placeholder.com/60x60?text=No+Image';
            };
            
            const name = document.createElement('div');
            name.className = 'name';
            name.textContent = character.name || 'Unknown';
            
            const faction = document.createElement('div');
            faction.className = 'faction';
            faction.textContent = character.faction || 'Unknown';
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => removeCharacterFromSquad(character.name));
            
            card.appendChild(removeBtn);
            card.appendChild(img);
            card.appendChild(name);
            card.appendChild(faction);
            
            container.appendChild(card);
        });
    }
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
