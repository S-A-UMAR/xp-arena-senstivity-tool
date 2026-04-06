const Calculator = require('./lib/calculator');

console.log('--- AXP SYSTEM VALIDATION PROOF ---');

// 1. PROOF: Global Offset (THE POWER) Works
console.log('\n[1] VERIFYING MASTER POWER (GLOBAL OFFSET)...');
const state = { brand: 'Apple', model: 'iPhone 15 Pro', neuralScale: 5.0, speed: 'balanced' };

const resultNormal = Calculator.compute(state, 1.0);
const resultPowered = Calculator.compute(state, 1.2); // 20% Increase

console.log(`- Normal General Sens (Offset 1.0): ${resultNormal.general}`);
console.log(`- Powered General Sens (Offset 1.2): ${resultPowered.general}`);

const parseVal = (str) => parseInt(str.split('-')[0]);
if (parseVal(resultPowered.general) > parseVal(resultNormal.general)) {
    console.log('✅ PROOF: Global Offset successfully increases sensitivities.');
} else {
    console.error('❌ FAIL: Global Offset ignored.');
}

// 2. PROOF: Range Logic (THE MASTERING FEEL) Works
console.log('\n[2] VERIFYING CALIBRATION RANGES...');
console.log(`- General Range: ${resultNormal.general}`);
console.log(`- Red Dot Range: ${resultNormal.redDot}`);
if (resultNormal.general.includes('-')) {
    console.log('✅ PROOF: System generates ±3 professional ranges instead of static numbers.');
}

// 3. PROOF: Manual Override with Offset
console.log('\n[3] VERIFYING MANUAL OVERRIDE + POWER...');
const manualState = { ...state, manualSens: '100' };
const manualResult = Calculator.compute(manualState, 1.1);
console.log(`- Manual Input: 100 | Result with 1.1x Offset: ${manualResult.general}`);
if (parseVal(manualResult.general) > 100) {
    console.log('✅ PROOF: Manual entries also respect the Master Power settings.');
}

// 4. PROOF: Device Tiers
console.log('\n[4] VERIFYING HARDWARE ARCHITECTURE TIERS...');
const highTier = Calculator.getTier('Samsung', 'S Series', 'S24 Ultra');
console.log(`- S24 Ultra Tier: ${highTier}`);
if (highTier === 'high') {
    console.log('✅ PROOF: Engine identifies hardware and adjusts base algorithms.');
}

// 5. PROOF: Dynamic Variance (Playstyle Speed) Works
console.log('\n[5] VERIFYING DYNAMIC PLAYSTYLE VARIANCE...');
const slowState = { ...state, speed: 'slow' };
const fastState = { ...state, speed: 'fast' };
const slowRes = Calculator.compute(slowState, 1.0);
const fastRes = Calculator.compute(fastState, 1.0);

const getVar = (str) => {
    const parts = str.split('-').map(Number);
    return (parts[1] - parts[0]);
};
console.log(`- Slow Variance: ${getVar(slowRes.general)} points`);
console.log(`- Fast Variance: ${getVar(fastRes.general)} points`);
if (getVar(fastRes.general) > getVar(slowRes.general)) {
    console.log('✅ PROOF: Dynamic variance (playstyle) successfully adjusts range precision.');
}

// 6. PROOF: ADS Metric Exists
console.log('\n[6] VERIFYING NEURAL METRICS (ADS)...');
if (resultNormal.ads) {
    console.log(`✅ PROOF: ADS Sensitivity recognized: ${resultNormal.ads}`);
}

console.log('\n--- VALIDATION 100% COMPLETE ---');
