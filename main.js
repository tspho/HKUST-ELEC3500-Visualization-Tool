import * as Physics from './fermidirac.js';
import * as PN from './pn_physics.js';
import * as CUR from './pn_current.js'; // Imported for Module 3 Current physics

let dopingRef = { na: 1e16, nd: 1e16 };

// Global constants for calculations
const NI_300K = 1e10; 
const VT = 0.0259;    

/**
 * Resets sliders and internal state for each module
 */
window.resetToDefaults = function(module) {
    if (module === 'module1') {
        document.getElementById('tempSlider').value = 300;
        document.getElementById('ndSliderN').value = 14;
        document.getElementById('naSliderP').value = 14;
        // Ensure radio buttons reset if applicable
        const elecRadio = document.querySelector('input[name="carrierType"][value="elec"]');
        if (elecRadio) elecRadio.checked = true;
    } else if (module === 'module2') {
        document.getElementById('naSliderMod2').value = 16;
        document.getElementById('ndSliderMod2').value = 16;
        document.getElementById('biasSlider').value = 0;
        dopingRef = { na: 1e16, nd: 1e16 };
    } else if (module === 'module3') {
        document.getElementById('naSliderMod3').value = 16;
        document.getElementById('ndSliderMod3').value = 16;
        document.getElementById('biasSliderM3').value = 0;
    }
};
window.updatePlot = function() {
    const T = parseFloat(document.getElementById('tempSlider').value);
    const activeTab = document.querySelector('.tab-button.active').innerText;
    const carrierType = document.querySelector('input[name="carrierType"]:checked').value;

    let Nd = 0, Na = 0;
    if (activeTab.includes("N-Type")) {
        Nd = Math.pow(10, parseFloat(document.getElementById('ndSliderN').value));
        document.getElementById('ndValueN').textContent = Math.log10(Nd).toFixed(1);
    } else if (activeTab.includes("P-Type")) {
        Na = Math.pow(10, parseFloat(document.getElementById('naSliderP').value));
        document.getElementById('naValueP').textContent = Math.log10(Na).toFixed(1);
    }
    document.getElementById('tempValue').textContent = T;

    const Ef = Physics.calculateFermiLevel(T, Nd, Na);
    const Eg = Physics.getBandGap(T);
    const Ec = Eg, Ev = 0;

    const energy = [], occupation = [];
    for (let e = -0.2; e <= Eg + 0.2; e += 0.005) {
        energy.push(e);
        let f = Physics.fermiDirac(e, Ef, T);
        occupation.push(carrierType === 'elec' ? f : 1 - f);
    }

    const traces = [
        { x: occupation, y: energy, name: 'Distribution', line: {color: carrierType === 'elec' ? 'blue' : 'green', width: 3} },
        { x: [0, 1], y: [Ec, Ec], name: 'Ec', line: {color: 'red', dash: 'dash'} },
        { x: [0, 1], y: [Ev, Ev], name: 'Ev', line: {color: 'red', dash: 'dash'} },
        { x: [0, 1], y: [Ef, Ef], name: 'Ef', line: {color: 'black', width: 2} }
    ];

    Plotly.react('plot', traces, {
        title: `Carrier Occupancy at ${T}K`,
        xaxis: { title: 'Probability', range: [0, 1] },
        yaxis: { title: 'Energy (eV)', range: [-0.1, Eg + 0.1] }
    });
};
window.setDopingReference = function() {
    dopingRef.na = Math.pow(10, parseFloat(document.getElementById('naSliderMod2').value));
    dopingRef.nd = Math.pow(10, parseFloat(document.getElementById('ndSliderMod2').value));
    window.updateModule2();
};

/**
 * Module 2: PN Junction Electrostatics
 */
window.updateModule2 = function() {
    const Na = Math.pow(10, parseFloat(document.getElementById('naSliderMod2').value));
    const Nd = Math.pow(10, parseFloat(document.getElementById('ndSliderMod2').value));
    const Va = parseFloat(document.getElementById('biasSlider').value);
    
    document.getElementById('naValueM2').textContent = Math.log10(Na).toFixed(1);
    document.getElementById('ndValueM2').textContent = Math.log10(Nd).toFixed(1);
    document.getElementById('biasValue').textContent = Va.toFixed(2);

    const results = PN.calculatePNJunction(Na, Nd, Va);
    const refResults = PN.calculatePNJunction(dopingRef.na, dopingRef.nd, 0); 
    
    if (!results || !refResults) return;

    const x = [], rho = [], field = [], pot = [];
    const rhoRef = [], fieldRef = [], potRef = [];
    const windowSize = Math.max(results.W, refResults.W) * 2; 
    
    for (let i = -windowSize; i <= windowSize; i += windowSize/250) {
        let pos = i * 1e4; // convert cm to µm
        x.push(pos);

        // Active State Calculations
        let r = 0, f = 0, v = 0;
        if (i >= -results.xp && i < 0) {
            r = -PN.Q_CHARGE * Na;
            f = -(PN.Q_CHARGE * Na / PN.EPSILON_SI) * (i + results.xp);
            v = (PN.Q_CHARGE * Na / (2 * PN.EPSILON_SI)) * Math.pow(i + results.xp, 2);
        } else if (i >= 0 && i <= results.xn) {
            r = PN.Q_CHARGE * Nd;
            f = results.Emax * (1 - i/results.xn);
            v = results.Vtotal - (PN.Q_CHARGE * Nd / (2 * PN.EPSILON_SI)) * Math.pow(results.xn - i, 2);
        } else if (i > results.xn) { v = results.Vtotal; }
        rho.push(r); field.push(f); pot.push(v);

        // Reference State (Snapshot at 0V)
        let rr = 0, rf = 0, rv = 0;
        if (i >= -refResults.xp && i < 0) {
            rr = -PN.Q_CHARGE * dopingRef.na;
            rf = -(PN.Q_CHARGE * dopingRef.na / PN.EPSILON_SI) * (i + refResults.xp);
            rv = (PN.Q_CHARGE * dopingRef.na / (2 * PN.EPSILON_SI)) * Math.pow(i + refResults.xp, 2);
        } else if (i >= 0 && i <= refResults.xn) {
            rr = PN.Q_CHARGE * dopingRef.nd;
            rf = refResults.Emax * (1 - i/refResults.xn);
            rv = refResults.Vtotal - (PN.Q_CHARGE * dopingRef.nd / (2 * PN.EPSILON_SI)) * Math.pow(refResults.xn - i, 2);
        } else if (i > refResults.xn) { rv = refResults.Vtotal; }
        rhoRef.push(rr); fieldRef.push(rf); potRef.push(rv);
    }

    const traces = [
        { x, y: rho, name: 'Active ρ', type: 'scatter', fill: 'tozeroy', yaxis: 'y', line: {color: 'rgba(255, 165, 0, 0.7)'} },
        { x, y: field, name: 'Active E', type: 'scatter', fill: 'tozeroy', yaxis: 'y2', line: {color: 'rgba(0, 0, 255, 0.6)'} },
        { x, y: pot, name: 'Active V', type: 'scatter', yaxis: 'y3', line: {color: 'red', width: 2.5} },
        { x, y: rhoRef, name: 'Ref ρ (0V)', yaxis: 'y', line: {color: '#444', dash: 'dash', width: 1.5} },
        { x, y: fieldRef, name: 'Ref E (0V)', yaxis: 'y2', line: {color: '#444', dash: 'dash', width: 2} },
        { x, y: potRef, name: 'Ref V (0V)', yaxis: 'y3', line: {color: '#888', dash: 'dash', width: 1.5} }
    ];

    const layout = {
        title: `PN Junction Electrostatics`,
        height: 850,
        showlegend: true,
        legend: { orientation: 'h', y: -0.15 },
        margin: { t: 60, b: 100, l: 100, r: 50 },
        yaxis: { title: 'ρ (C/cm³)', domain: [0.7, 1], zeroline: true },
        yaxis2: { title: 'E (V/cm)', domain: [0.35, 0.65], zeroline: true },
        yaxis3: { title: 'V (Volts)', domain: [0, 0.3], zeroline: true },
        xaxis: { title: 'Distance (µm)', zeroline: true, anchor: 'y3', side: 'bottom' }
    };

    Plotly.react('pnPlot', traces, layout);
};

/**
 * Module 3: PN Junction Current and Carrier Injection
 */
window.updateModule3 = function() {
    const Na = Math.pow(10, parseFloat(document.getElementById('naSliderMod3').value));
    const Nd = Math.pow(10, parseFloat(document.getElementById('ndSliderMod3').value));
    const Va = parseFloat(document.getElementById('biasSliderM3').value);

    document.getElementById('naValueM3').textContent = Math.log10(Na).toFixed(1);
    document.getElementById('ndValueM3').textContent = Math.log10(Nd).toFixed(1);
    document.getElementById('biasValueM3').textContent = Va.toFixed(2);

    const physics = CUR.calculateCurrentPhysics(Na, Nd, Va);

    // 1. Generate I-V Curve data
    const vRange = [], iRange = [];
    for (let v = -0.5; v <= 0.7; v += 0.01) {
        const p = CUR.calculateCurrentPhysics(Na, Nd, v);
        vRange.push(v);
        iRange.push(p.current);
    }

    // 2. Generate Carrier Concentration Profiles
    const x = [], n = [], p = [];
    for (let dist = -40e-4; dist <= 40e-4; dist += 0.5e-4) {
        x.push(dist * 1e4); // Convert cm to µm
        if (dist < 0) { // P-side
            p.push(Na);
            n.push(physics.np0 + physics.delta_np0 * Math.exp(dist / physics.Ln));
        } else { // N-side
            n.push(Nd);
            p.push(physics.pn0 + physics.delta_pn0 * Math.exp(-dist / physics.Lp));
        }
    }

    // Plot I-V Characteristics
    Plotly.react('ivPlot', [
        { x: vRange, y: iRange, name: 'I-V Curve', line: {color: 'red'} },
        { x: [Va], y: [physics.current], mode: 'markers', name: 'Operating Point', marker: {size: 10, color: 'black'} }
    ], { 
        title: 'I-V Characteristics', 
        xaxis: {title: 'Voltage (V)'}, 
        yaxis: {title: 'Current (A)', exponentformat: 'e'} 
    });

    // Plot Carrier Profiles with Log Scale
    Plotly.react('carrierPlot', [
        { x, y: n, name: 'n(x)', line: {color: 'blue'} },
        { x, y: p, name: 'p(x)', line: {color: 'green'} }
    ], { 
        title: 'Minority Carrier Injection', 
        yaxis: {type: 'log', title: 'Concentration (cm⁻³)', range: [2, 19]}, 
        xaxis: {title: 'Distance (µm)'} 
    });
};
