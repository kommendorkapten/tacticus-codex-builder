// Global variables
let charactersData = [];
let sortColumn = null;
let sortDirection = 'asc';

// Load and initialize the table
async function loadCharacters() {
    try {
        const response = await fetch('data/units.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        charactersData = await response.json();
        
        // Hide loading indicator
        document.getElementById('loading').style.display = 'none';
        
        // Render the table
        renderTable(charactersData);
        
        // Setup sort handlers
        setupSortHandlers();
    } catch (error) {
        console.error('Error loading character data:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
    }
}

// Render the table with character data
function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    data.forEach(character => {
        const row = document.createElement('tr');
        
        // Portrait
        const portraitCell = document.createElement('td');
        portraitCell.className = 'portrait-cell';
        const img = document.createElement('img');
        img.src = character.portrait_url || 'placeholder.png';
        img.alt = character.name || 'Character';
        img.className = 'portrait';
        img.onerror = function() {
            this.src = 'https://via.placeholder.com/60x60?text=No+Image';
        };
        portraitCell.appendChild(img);
        row.appendChild(portraitCell);
        
        // Name
        const nameCell = document.createElement('td');
        nameCell.className = 'name-cell';
        nameCell.textContent = character.name || 'Unknown';
        row.appendChild(nameCell);
        
        // Faction
        const factionCell = document.createElement('td');
        factionCell.className = 'faction-cell';
        factionCell.textContent = character.faction || 'Unknown';
        row.appendChild(factionCell);
        
        // Damage Types
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
        
        // Traits
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
        
        // Stats
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
        
        // Alliance
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

// Setup sort handlers for sortable columns
function setupSortHandlers() {
    const sortableHeaders = document.querySelectorAll('th.sortable');
    
    sortableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const column = this.getAttribute('data-column');
            
            // Toggle sort direction
            if (sortColumn === column) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = column;
                sortDirection = 'asc';
            }
            
            // Update UI to show sort direction
            sortableHeaders.forEach(h => {
                h.classList.remove('asc', 'desc');
            });
            this.classList.add(sortDirection);
            
            // Sort and re-render
            sortData(column, sortDirection);
            renderTable(charactersData);
        });
    });
}

// Sort the data based on column and direction
function sortData(column, direction) {
    charactersData.sort((a, b) => {
        let aValue = a[column];
        let bValue = b[column];
        
        // Handle undefined/null values
        if (aValue === undefined || aValue === null) aValue = '';
        if (bValue === undefined || bValue === null) bValue = '';
        
        // Convert to lowercase for case-insensitive comparison
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();
        
        // Compare
        if (aValue < bValue) {
            return direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', loadCharacters);
