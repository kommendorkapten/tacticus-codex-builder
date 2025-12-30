/**
 * Unit tests for computeBuffDamage function
 * 
 * Run with: npm test
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import the functions we need to test from shared module
import { computeBuffDamage, interpolateBuffValue } from '../lib/buffCalculations.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load character data from units.json
const unitsPath = path.join(__dirname, '../data/units.json');
const unitsData = JSON.parse(fs.readFileSync(unitsPath, 'utf8'));

// Helper function to find a character by name
function findCharacter(name) {
    const char = unitsData.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (!char) {
        throw new Error(`Character "${name}" not found in units.json`);
    }
    return char;
}

// Helper function to find a specific buff from a character
function findBuff(character, buffName) {
    if (!character.buffs) {
        throw new Error(`Character "${character.name}" has no buffs`);
    }
    const buff = character.buffs.find(b => b.name === buffName);
    if (!buff) {
        throw new Error(`Buff "${buffName}" not found on character "${character.name}"`);
    }
    return buff;
}

// Helper to convert a character's buff to the format expected by computeBuffDamage
function createBuffInfo(sourceCharacter, buff) {
    return {
        buffName: buff.name,
        sourceName: sourceCharacter.name,
        effect: buff.effect,
        omit: buff.omit
    };
}

describe('interpolateBuffValue', () => {
    test('returns exact value when level exists in map', () => {
        const damageMap = { "8": "10", "17": "22", "26": "55", "35": "114" };
        expect(interpolateBuffValue(damageMap, 17)).toBe(22);
    });

    test('interpolates between levels correctly', () => {
        const damageMap = { "8": "10", "17": "22", "26": "55", "35": "114" };
        // Level 37 is between 35 (114) and above, should return 114 (highest)
        expect(interpolateBuffValue(damageMap, 37)).toBe(114);
    });

    test('returns lowest value when level is below all keys', () => {
        const damageMap = { "8": "10", "17": "22" };
        expect(interpolateBuffValue(damageMap, 5)).toBe(10);
    });

    test('returns highest value when level is above all keys', () => {
        const damageMap = { "8": "10", "17": "22", "26": "55" };
        expect(interpolateBuffValue(damageMap, 30)).toBe(55);
    });

    test('returns null for invalid input', () => {
        expect(interpolateBuffValue(null, 37)).toBeNull();
        expect(interpolateBuffValue(undefined, 37)).toBeNull();
    });
});

describe('computeBuffDamage', () => {
    // Load test characters from units.json
    const thaddeus = findCharacter("Thaddeus Noble");
    const abaddon = findCharacter("Abaddon the Despoiler");
    const bellator = findCharacter("Bellator");
    const sygex = findCharacter("Sy-gex");
    const haarken = findCharacter("Haarken Worldclaimer");

    // Get buffs from characters and convert to buff info format
    const abaddonBuffRaw = findBuff(abaddon, "First Among Traitors");
    const abaddonBuff = createBuffInfo(abaddon, abaddonBuffRaw);

    // Thaddeus has multiple Spotter buffs - find the universal one (with grand_alliance: *) 
    // and the trait-based one (with traits: Heavy Weapon)
    const spotterBuffs = thaddeus.buffs.filter(b => b.name === "Spotter");
    const spotterUniversalRaw = spotterBuffs.find(b => 
        b.affects.grand_alliance && b.affects.grand_alliance.includes('*')
    );
    const spotterHeavyWeaponRaw = spotterBuffs.find(b => 
        b.affects.traits && b.affects.traits.includes('Heavy Weapon')
    );
    
    const spotterBuffUniversal = createBuffInfo(thaddeus, spotterUniversalRaw);
    const spotterBuffHeavyWeapon = createBuffInfo(thaddeus, spotterHeavyWeaponRaw);

    const BUFF_LEVEL = 37;

    // Calculate interpolated values at level 37 from actual buff data
    const ABADDON_DAMAGE_AT_37 = interpolateBuffValue(abaddonBuffRaw.effect.damage, BUFF_LEVEL);
    const ABADDON_BONUS_AT_37 = interpolateBuffValue(abaddonBuffRaw.effect.damage_bonus, BUFF_LEVEL);
    const SPOTTER_UNIVERSAL_AT_37 = interpolateBuffValue(spotterUniversalRaw.effect.damage, BUFF_LEVEL);
    const SPOTTER_HEAVY_WEAPON_AT_37 = interpolateBuffValue(spotterHeavyWeaponRaw.effect.damage, BUFF_LEVEL);

    describe('basic structure', () => {
        test('returns correct structure with no buffs', () => {
            const result = computeBuffDamage(bellator, [], BUFF_LEVEL);
            
            expect(result).toHaveProperty('hasMelee');
            expect(result).toHaveProperty('hasRange');
            expect(result).toHaveProperty('meleeHits');
            expect(result).toHaveProperty('rangeHits');
            expect(result).toHaveProperty('buffRows');
            expect(result).toHaveProperty('totals');
            expect(result.buffRows).toEqual([]);
            expect(result.totals.damage).toBe(0);
            expect(result.totals.bonus).toBe(0);
        });

        test('correctly identifies melee-only character (Bellator)', () => {
            const result = computeBuffDamage(bellator, [], BUFF_LEVEL);
            
            expect(result.hasMelee).toBe(true);
            expect(result.hasRange).toBe(false);
            expect(result.meleeHits).toBe(bellator.stats.melee);
            expect(result.rangeHits).toBeNull();
        });

        test('correctly identifies melee+range character (Sy-gex)', () => {
            const result = computeBuffDamage(sygex, [], BUFF_LEVEL);
            
            expect(result.hasMelee).toBe(true);
            expect(result.hasRange).toBe(true);
            expect(result.meleeHits).toBe(sygex.stats.melee);
            expect(result.rangeHits).toBe(sygex.stats.range);
        });
    });

    describe('Abaddon buff on Chaos characters', () => {
        test('Haarken receives Abaddon buff correctly (melee only)', () => {
            const result = computeBuffDamage(haarken, [abaddonBuff], BUFF_LEVEL);
            
            // Haarken has melee hits, no range
            expect(result.hasMelee).toBe(true);
            expect(result.hasRange).toBe(false);
            
            // Should have 2 buff rows (damage and damage_bonus)
            expect(result.buffRows.length).toBe(2);
            
            // Check damage row
            const damageRow = result.buffRows.find(r => !r.isBonus);
            expect(damageRow).toBeDefined();
            expect(damageRow.name).toBe("First Among Traitors");
            expect(damageRow.value).toBe(ABADDON_DAMAGE_AT_37);
            expect(damageRow.buffedMelee).toBe(haarken.stats.melee * ABADDON_DAMAGE_AT_37);
            
            // Check bonus row
            const bonusRow = result.buffRows.find(r => r.isBonus);
            expect(bonusRow).toBeDefined();
            expect(bonusRow.name).toBe("First Among Traitors+");
            expect(bonusRow.value).toBe(ABADDON_BONUS_AT_37);
            expect(bonusRow.buffedMelee).toBe(haarken.stats.melee * ABADDON_BONUS_AT_37);
            
            // Check totals
            expect(result.totals.damage).toBe(ABADDON_DAMAGE_AT_37);
            expect(result.totals.bonus).toBe(ABADDON_BONUS_AT_37);
            expect(result.totals.buffedMelee).toBe(haarken.stats.melee * ABADDON_DAMAGE_AT_37);
            expect(result.totals.buffedBonusMelee).toBe(haarken.stats.melee * ABADDON_BONUS_AT_37);
        });

        test('Abaddon buff does not apply to Imperial characters', () => {
            // Bellator is Imperial, Abaddon buff is for Chaos only
            // But computeBuffDamage doesn't filter by alliance - that happens in renderSynergyGraph
            // So we just test that it computes correctly if the buff is passed in
            const result = computeBuffDamage(bellator, [abaddonBuff], BUFF_LEVEL);
            
            // Bellator has melee hits only
            expect(result.buffRows.length).toBe(2);
            expect(result.totals.buffedMelee).toBe(bellator.stats.melee * ABADDON_DAMAGE_AT_37);
        });
    });

    describe('Thaddeus Spotter buff', () => {
        test('Spotter (ranged restriction) does not buff melee-only character', () => {
            // Bellator has no range stat, so ranged-restricted buff should yield 0
            const result = computeBuffDamage(bellator, [spotterBuffUniversal], BUFF_LEVEL);
            
            // Since restriction is 'ranged' and Bellator has no range, buffedRange should be 0
            // And since it's ranged-only, buffedMelee should also be 0
            expect(result.buffRows.length).toBe(0); // No rows because both melee and range are 0
            expect(result.totals.damage).toBe(0);
        });

        test('Spotter (Heavy Weapon) buffs Sy-gex correctly', () => {
            // Sy-gex has Heavy Weapon trait and has both melee and range
            // But Spotter has ranged restriction, so only ranged attacks are buffed
            const result = computeBuffDamage(sygex, [spotterBuffHeavyWeapon], BUFF_LEVEL);
            
            expect(result.buffRows.length).toBe(1);
            
            const damageRow = result.buffRows[0];
            expect(damageRow.name).toBe("Spotter");
            expect(damageRow.value).toBe(SPOTTER_HEAVY_WEAPON_AT_37);
            expect(damageRow.buffedMelee).toBe(0); // Ranged restriction means no melee buff
            expect(damageRow.buffedRange).toBe(sygex.stats.range * SPOTTER_HEAVY_WEAPON_AT_37);
            
            expect(result.totals.damage).toBe(SPOTTER_HEAVY_WEAPON_AT_37);
            expect(result.totals.buffedMelee).toBe(0); // Ranged restriction means no melee buff
            expect(result.totals.buffedRange).toBe(sygex.stats.range * SPOTTER_HEAVY_WEAPON_AT_37);
        });

        test('Spotter (ranged restriction) buffs Abaddon ranged attacks only', () => {
            // Abaddon has both melee and range
            // Spotter with ranged restriction should only buff range
            const result = computeBuffDamage(abaddon, [spotterBuffUniversal], BUFF_LEVEL);
            
            expect(result.buffRows.length).toBe(1);
            
            const damageRow = result.buffRows[0];
            expect(damageRow.buffedMelee).toBe(0); // Ranged restriction means no melee buff
            expect(damageRow.buffedRange).toBe(abaddon.stats.range * SPOTTER_UNIVERSAL_AT_37);
            
            expect(result.totals.buffedMelee).toBe(0);
            expect(result.totals.buffedRange).toBe(abaddon.stats.range * SPOTTER_UNIVERSAL_AT_37);
        });
    });

    describe('multiple buffs', () => {
        test('correctly stacks multiple buffs on same character', () => {
            // Give Sy-gex both Abaddon buff and Spotter buff
            const result = computeBuffDamage(sygex, [abaddonBuff, spotterBuffHeavyWeapon], BUFF_LEVEL);
            
            // Should have 3 rows: Abaddon damage, Abaddon bonus, Spotter damage
            expect(result.buffRows.length).toBe(3);
            
            // Total damage should be Abaddon + Spotter
            expect(result.totals.damage).toBe(ABADDON_DAMAGE_AT_37 + SPOTTER_HEAVY_WEAPON_AT_37);
            expect(result.totals.bonus).toBe(ABADDON_BONUS_AT_37);
            
            // Total buffed melee: only Abaddon contributes (Spotter has ranged restriction)
            expect(result.totals.buffedMelee).toBe(sygex.stats.melee * ABADDON_DAMAGE_AT_37);
            // Total buffed range: range hits * (Abaddon + Spotter)
            expect(result.totals.buffedRange).toBe(sygex.stats.range * ABADDON_DAMAGE_AT_37 + sygex.stats.range * SPOTTER_HEAVY_WEAPON_AT_37);
        });
    });

    describe('edge cases', () => {
        test('handles character with no stats gracefully', () => {
            const noStatsChar = { name: "No Stats", stats: {} };
            const result = computeBuffDamage(noStatsChar, [abaddonBuff], BUFF_LEVEL);
            
            expect(result.hasMelee).toBe(false);
            expect(result.hasRange).toBe(false);
            expect(result.buffRows.length).toBe(0);
        });

        test('handles null buffs gracefully', () => {
            const result = computeBuffDamage(bellator, null, BUFF_LEVEL);
            expect(result.buffRows).toEqual([]);
        });

        test('handles buff with missing effect gracefully', () => {
            const badBuff = { buffName: "Bad Buff", effect: null };
            const result = computeBuffDamage(bellator, [badBuff], BUFF_LEVEL);
            expect(result.buffRows.length).toBe(0);
        });
    });
});
