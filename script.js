// Global variables
let charactersData = [];
let filteredData = [];
let sortColumn = null;
let sortDirection = 'asc';
let selectedTrait = '';
let selectedDamageType = '';

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

document.addEventListener('DOMContentLoaded', loadCharacters);
