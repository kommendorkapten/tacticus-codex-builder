/**
 * Pure functions for buff damage calculations.
 * This module is shared between the browser app and unit tests.
 */

/**
 * Interpolate buff values at a specific level based on a damage map.
 * 
 * @param {Object} damageMap - Object with level keys and damage values
 * @param {number} level - The level to compute the value at
 * @returns {number|null} The interpolated damage value or null if invalid input
 */
export function interpolateBuffValue(damageMap, level) {
    if (!damageMap || typeof damageMap !== 'object') return null;

    // Convert keys to numbers and sort
    const levels = Object.keys(damageMap).map(Number).sort((a, b) => a - b);

    // Exact match
    if (damageMap[level.toString()]) {
        return parseInt(damageMap[level.toString()]);
    }

    // Find surrounding levels for interpolation
    let lowerLevel = null;
    let upperLevel = null;

    for (let i = 0; i < levels.length; i++) {
        if (levels[i] < level) {
            lowerLevel = levels[i];
        }
        if (levels[i] > level && upperLevel === null) {
            upperLevel = levels[i];
            break;
        }
    }

    // If level is below all keys, return lowest value
    if (lowerLevel === null && upperLevel !== null) {
        return parseInt(damageMap[upperLevel.toString()]);
    }

    // If level is above all keys, return highest value
    if (upperLevel === null && lowerLevel !== null) {
        return parseInt(damageMap[lowerLevel.toString()]);
    }

    // Linear interpolation
    if (lowerLevel !== null && upperLevel !== null) {
        const lowerValue = parseInt(damageMap[lowerLevel.toString()]);
        const upperValue = parseInt(damageMap[upperLevel.toString()]);
        const ratio = (level - lowerLevel) / (upperLevel - lowerLevel);
        return Math.round(lowerValue + (upperValue - lowerValue) * ratio);
    }

    return null;
}

/**
 * Computes buff damage statistics for a character based on their stats and received buffs.
 * This function is pure and can be unit tested independently of rendering.
 * 
 * @param {Object} character - The character object with stats (melee, range)
 * @param {Array} buffs - Array of buff info objects with buffName, effect, etc.
 * @param {number} level - The level to compute buff values at
 * @returns {Object} Computed buff damage data structure
 */
export function computeBuffDamage(character, buffs, level) {
    const hasMelee = character.stats && character.stats.melee !== undefined;
    const hasRange = character.stats && character.stats.range !== undefined;
    const meleeHits = hasMelee ? character.stats.melee : null;
    const rangeHits = hasRange ? character.stats.range : null;

    const result = {
        hasMelee,
        hasRange,
        meleeHits,
        rangeHits,
        buffRows: [],
        totals: {
            damage: 0,
            bonus: 0,
            buffedMelee: 0,
            buffedRange: 0,
            buffedBonusMelee: 0,
            buffedBonusRange: 0
        }
    };

    if (!buffs || buffs.length === 0) {
        return result;
    }

    buffs.forEach(buffInfo => {
        // Process damage effect
        if (buffInfo.effect && buffInfo.effect.damage) {
            const damageValue = interpolateBuffValue(buffInfo.effect.damage, level);
            if (damageValue !== null) {
                const restriction = buffInfo.effect.restriction;
                const isSingleHit = buffInfo.effect.single_hit === true;

                let buffedMelee = 0;
                let buffedRange = 0;

                if (hasMelee && restriction !== 'ranged') {
                    buffedMelee = isSingleHit ? damageValue : meleeHits * damageValue;
                }
                if (hasRange && restriction !== 'melee') {
                    buffedRange = isSingleHit ? damageValue : rangeHits * damageValue;
                }

                if (buffedMelee > 0 || buffedRange > 0) {
                    result.totals.damage += damageValue;
                    result.totals.buffedMelee += buffedMelee;
                    result.totals.buffedRange += buffedRange;

                    result.buffRows.push({
                        name: buffInfo.buffName,
                        value: damageValue,
                        buffedMelee,
                        buffedRange,
                        isBonus: false
                    });
                }
            }
        }

        // Process damage_bonus effect
        if (buffInfo.effect && buffInfo.effect.damage_bonus) {
            const bonusValue = interpolateBuffValue(buffInfo.effect.damage_bonus, level);
            if (bonusValue !== null) {
                const restriction = buffInfo.effect.restriction;
                const isSingleHit = buffInfo.effect.single_hit === true;

                let buffedMelee = 0;
                let buffedRange = 0;

                if (hasMelee && restriction !== 'ranged') {
                    buffedMelee = isSingleHit ? bonusValue : meleeHits * bonusValue;
                }
                if (hasRange && restriction !== 'melee') {
                    buffedRange = isSingleHit ? bonusValue : rangeHits * bonusValue;
                }

                if (buffedMelee > 0 || buffedRange > 0) {
                    result.totals.bonus += bonusValue;
                    result.totals.buffedBonusMelee += buffedMelee;
                    result.totals.buffedBonusRange += buffedRange;

                    result.buffRows.push({
                        name: buffInfo.buffName + '+',
                        value: bonusValue,
                        buffedMelee,
                        buffedRange,
                        isBonus: true
                    });
                }
            }
        }
    });

    return result;
}
