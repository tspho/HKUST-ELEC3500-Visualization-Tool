import * as Physics from './fermidirac.js';
import * as PN from './pn_physics.js';
import * as CUR from './pn_current.js'; 

let dopingRef = { na: 1e16, nd: 1e16 };
const VT = 0.0259;    
const EG = 1.12; 

// Animation Globals
let animationFrameId = null;
let particles = [];
const NUM_PARTICLES = 50;

window.resetToDefaults = function(module) {
    if (module === 'module1') {
        document.getElementById('tempSlider').value = 300;
        document.getElementById('ndSliderN').value = 14;
        document.getElementById('naSliderP').value = 14;
        const elecRadio = document.querySelector('input[name="carrierType"][value="elec"]');
        if (elecRadio) elecRadio.checked = true;
    } else if (module === 'module2') {
        document.getElementById('naSliderMod2').value = 16;
        document.getElementById('ndSliderMod2').value = 16;
        document.getElementById('biasSlider').value = 0;
        dopingRef = { na: 1e16, nd: 1e16 };
    } else if (module === 'module3') {
        // High default doping (17.5) makes Vbr small (~3.5V), visible on default scale
        document.getElementById('naSliderMod3').value = 17.5;
        document.getElementById('ndSliderMod3').value = 17.5;
        document.getElementById('biasSliderM3').value = 0;
        if (window.stopAnimation) window.stopAnimation();
    }
};

window.stopAnimation = function() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    particles = [];
};

// ... [Module 1 & 2 Update Functions - KEEP EXISTING CODE] ...
// (For brevity, assuming updatePlot and updateModule2 are pasted here as in your file)
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
        let pos = i * 1e4; 
        x.push(pos);
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
    Plotly.react('pnPlot', traces, {
        title: `PN Junction Electrostatics`,
        height: 850,
        showlegend: true,
        legend: { orientation: 'h', y: -0.15 },
        margin: { t: 60, b: 100, l: 100, r: 50 },
        yaxis: { title: 'ρ (C/cm³)', domain: [0.7, 1] },
        yaxis2: { title: 'E (V/cm)', domain: [0.35, 0.65] },
        yaxis3: { title: 'V (Volts)', domain: [0, 0.3] },
        xaxis: { title: 'Distance (µm)', anchor: 'y3', side: 'bottom' }
    });
};

// ==========================================
// MODULE 3: Current & Energy Bands
// ==========================================
window.updateModule3 = function() {
    const Na = Math.pow(10, parseFloat(document.getElementById('naSliderMod3').value));
    const Nd = Math.pow(10, parseFloat(document.getElementById('ndSliderMod3').value));
    const Va = parseFloat(document.getElementById('biasSliderM3').value);

    document.getElementById('naValueM3').textContent = Math.log10(Na).toFixed(1);
    document.getElementById('ndValueM3').textContent = Math.log10(Nd).toFixed(1);
    document.getElementById('biasValueM3').textContent = Va.toFixed(2);

    const physics = CUR.calculateCurrentPhysics(Na, Nd, Va);
    const electrostatics = PN.calculatePNJunction(Na, Nd, Va);

    // ------------------------------------
    // 1. I-V Curve (Dynamically Resized)
    // ------------------------------------
    const breakVol = physics.Vbr;
    // Stretch the plot axis to include the breakdown voltage, with a buffer
    const minPlotV = Math.min(-breakVol * 1.2, -5); 
    
    const vRange = [], iRange = [];
    const step = Math.abs(minPlotV) / 100;
    for (let v = minPlotV; v <= 0.8; v += step) {
        const p = CUR.calculateCurrentPhysics(Na, Nd, v);
        vRange.push(v);
        iRange.push(p.current);
    }

    // ------------------------------------
    // 2. Carrier Profiles
    // ------------------------------------
    const carrierData = CUR.calculateCarrierProfile(Na, Nd, Va, electrostatics);

    // ------------------------------------
    // 3. Energy Bands
    // ------------------------------------
    const xBand = [], Ec = [], Ev = [], Ei = [], Efn = [], Efp = [];
    const windowSize = electrostatics.W * 2; 
    
    for (let i = -windowSize; i <= windowSize; i += windowSize/150) {
        let pos = i * 1e4; 
        xBand.push(pos);
        let Vx = 0;
        if (i < -electrostatics.xp) Vx = 0; 
        else if (i > electrostatics.xn) Vx = electrostatics.Vtotal; 
        else if (i <= 0) Vx = (PN.Q_CHARGE * Na / (2 * PN.EPSILON_SI)) * Math.pow(i + electrostatics.xp, 2);
        else Vx = electrostatics.Vtotal - (PN.Q_CHARGE * Nd / (2 * PN.EPSILON_SI)) * Math.pow(electrostatics.xn - i, 2);

        const Energy = -Vx; 
        Ec.push(Energy + EG/2 + 0.5); 
        Ev.push(Energy - EG/2 + 0.5);
        Efp.push( -EG/2 + 0.5 + VT*Math.log(Na/1e10) ); 
        Efn.push( -EG/2 + 0.5 + VT*Math.log(Na/1e10) + Va ); 
    }

    // ------------------------------------
    // PLOTTING
    // ------------------------------------
    const traceEc = { x: xBand, y: Ec, name: 'Ec', line: {color: 'black', width: 2} };
    const traceEv = { x: xBand, y: Ev, name: 'Ev', line: {color: 'black', width: 2} };
    const traceEfn = { x: xBand, y: Efn, name: 'Efn', line: {color: 'blue', dash: 'dash'} };
    const traceEfp = { x: xBand, y: Efp, name: 'Efp', line: {color: 'green', dash: 'dash'} };
    const traceElec = { x: [null], y: [null], mode: 'markers', name: 'Electrons', marker: {color: 'blue', size: 6} };
    const traceHole = { x: [null], y: [null], mode: 'markers', name: 'Holes', marker: {color: 'red', size: 6, symbol: 'circle-open', line: {width: 2}} };

    Plotly.react('bandPlot', [traceEc, traceEv, traceEfn, traceEfp, traceElec, traceHole], {
        title: 'Energy Band Diagram (Avalanche at Breakdown)',
        height: 500,
        xaxis: { title: 'Distance (µm)', range: [xBand[0], xBand[xBand.length-1]] },
        yaxis: { title: 'Energy (eV)' },
        showlegend: true
    }).then(() => {
        // PASS Vbr HERE! This was missing in your upload.
        startParticleAnimation(xBand, Ec, Ev, Va, physics.Vbr);
    });

    Plotly.react('ivPlot', [
        { x: vRange, y: iRange, name: 'I-V', line: {color: 'red', width: 3} },
        { x: [Va], y: [physics.current], mode: 'markers', name: 'Op Point', marker: {size: 12, color: 'black'} }
    ], { 
        title: `I-V Curve (Breakdown at -${physics.Vbr.toFixed(1)}V)`, 
        xaxis: {title: 'Voltage (V)', range: [minPlotV, 1.0]}, 
        yaxis: {title: 'Current (A)', exponentformat: 'e'}, 
        hovermode: false 
    });

    Plotly.react('carrierPlot', [
        { x: carrierData.x, y: carrierData.n, name: 'Electrons (n)', line: {color: 'blue'} },
        { x: carrierData.x, y: carrierData.p, name: 'Holes (p)', line: {color: 'green'} }
    ], { 
        title: 'Carrier Concentrations (Log Scale)', 
        yaxis: { type: 'log', title: 'Concentration (cm⁻³)', range: [0, 20] }, 
        xaxis: { title: 'Distance (µm)' },
        showlegend: true
    });
};

// ==========================================
// ANIMATION LOGIC (RESTORED)
// ==========================================
function startParticleAnimation(xArray, EcArray, EvArray, Va, Vbr) {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    // Reset function to spawn particles
    function resetParticle(p, forceAvalanche = false) {
        // Check for breakdown condition
        const isAvalanche = forceAvalanche || (Math.abs(Va) > Vbr);
        
        if (isAvalanche) {
            // AVALANCHE: Spawn in the center (Depletion region)
            p.x = (Math.random() - 0.5) * 0.2; 
            p.type = Math.random() > 0.5 ? 'n' : 'p';
        } else {
            // NORMAL: Spawn randomly across device
            p.x = (Math.random() - 0.5) * 4;
            p.type = Math.random() > 0.5 ? 'n' : 'p';
        }
    }

    if (particles.length === 0) {
        for(let i=0; i<NUM_PARTICLES; i++) {
            particles.push({ type: 'n', x: 0 }); 
            resetParticle(particles[i], false);
        }
    }

    function animate() {
        const eX = [], eY = [];
        const hX = [], hY = [];

        const minX = xArray[0];
        const maxX = xArray[xArray.length-1];
        const step = (maxX - minX) / xArray.length;
        const isAvalanche = Math.abs(Va) > Vbr;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            
            // Recalculate index
            let idx = Math.floor((p.x - minX) / step);
            if (idx < 0) idx = 0;
            if (idx >= xArray.length - 1) idx = xArray.length - 2;

            if (isAvalanche) {
                // EXPLOSION EFFECT
                const speed = 0.15;
                // Electrons move Right (to positive N-side in reverse bias)
                // Holes move Left (to negative P-side)
                if (p.type === 'n') p.x += speed;
                else p.x -= speed;

                // Respawn in center if they fly off screen
                if (p.x > maxX || p.x < minX) {
                    resetParticle(p, true);
                }
            } else {
                // NORMAL DRIFT/DIFFUSION
                const diffusion = (Math.random() - 0.5) * 0.05; 
                
                if (p.type === 'n') {
                    // Drift down Ec
                    const slope = EcArray[idx+1] - EcArray[idx];
                    p.x += (-slope * 5) + diffusion;
                } else {
                    // Drift up Ev
                    const slope = EvArray[idx+1] - EvArray[idx];
                    p.x += (slope * 5) + diffusion;
                }
                
                // Wrap around
                if (p.x > maxX) p.x = minX; 
                if (p.x < minX) p.x = maxX;
            }

            // Map Y position to band energy
            idx = Math.floor((p.x - minX) / step);
            if (idx < 0) idx = 0; if (idx >= xArray.length-1) idx = xArray.length-2;
            
            if (p.type === 'n') {
                eX.push(p.x);
                eY.push(EcArray[idx]);
            } else {
                hX.push(p.x);
                hY.push(EvArray[idx]);
            }
        }

        Plotly.restyle('bandPlot', { x: [eX, hX], y: [eY, hY] }, [4, 5]);
        animationFrameId = requestAnimationFrame(animate);
    }
    animate();
}