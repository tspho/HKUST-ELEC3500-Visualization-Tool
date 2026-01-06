import * as Physics from './fermidirac.js';

export const NI = 1.0e10; 
export const VT = 0.0259; 
export const Q = 1.602e-19; 

// Mobility and Lifetime constants
const Mun = 1350; 
const Mup = 480;  
const Tau = 1e-6; 

function calculateVbr(N) {
    // Breakdown voltage scales inversely with doping
    // Approx: 1e16 -> ~60V, 1e17.5 -> ~3.5V
    const ref = 1e16;
    let vbr = 60 * Math.pow(N / ref, -0.75);
    
    // Clamp for visual sanity
    if (vbr > 100) vbr = 100; 
    if (vbr < 2) vbr = 2; 
    return vbr;
}

export function calculateCurrentPhysics(Na, Nd, Va) {
    const Dn = Mun * VT;
    const Dp = Mup * VT;
    const Ln = Math.sqrt(Dn * Tau);
    const Lp = Math.sqrt(Dp * Tau);

    const np0 = (NI * NI) / Na;
    const pn0 = (NI * NI) / Nd;

    // 1. Ideal Diode Current (Shockley)
    const expFactor = Math.exp(Math.min(Va, 0.9) / VT) - 1;
    const termN = Dn / (Ln * Na);
    const termP = Dp / (Lp * Nd);
    const Js = Q * (NI * NI) * (termN + termP); 
    
    let diodeCurrent = Js * expFactor;

    // 2. Breakdown Logic (Reverse Bias)
    const lighterDoping = Math.min(Na, Nd);
    const Vbr = calculateVbr(lighterDoping);
    
    let breakdownCurrent = 0;
    if (Va < 0) {
        const V_mag = Math.abs(Va);
        
        // Hard Breakdown Threshold
        if (V_mag > Vbr) {
            // Massive exponential current for the vertical wall effect
            // We use a high multiplier to make it dominate the plot immediately
            const overdrive = V_mag - Vbr;
            breakdownCurrent = -Js * 1e9 * (Math.exp(overdrive * 2) - 1 + overdrive);
        }
    }

    // Safety clamp to prevent Plotly from crashing on infinite numbers
    const MAX_CURRENT = 1e5; 
    if (breakdownCurrent < -MAX_CURRENT) breakdownCurrent = -MAX_CURRENT;

    return {
        current: diodeCurrent + breakdownCurrent,
        Vbr: Vbr,
        np0: np0,
        pn0: pn0,
        Ln: Ln, 
        Lp: Lp
    };
}

export function calculateCarrierProfile(Na, Nd, Va, electrostatics) {
    const { Ln, Lp, np0, pn0 } = calculateCurrentPhysics(Na, Nd, Va);
    
    const xDist = [];
    const n = [];
    const p = [];
    
    // Plot Range: +/- 3*W to show diffusion tails clearly
    const limit = Math.max(electrostatics.W * 3, 2e-4); 
    const step = limit / 150;
    
    // Injection / Extraction Factor
    // Forward (Va > 0): Factor > 1 (Injection)
    // Reverse (Va < 0): Factor ~ 0 (Extraction/Dip)
    const injectionFactor = Math.exp(Math.min(Va, 0.8) / VT); 

    for (let pos = -limit; pos <= limit; pos += step) {
        let x_microns = pos * 1e4;
        let n_val, p_val;
        
        // P-Side Neutral Region (x < -xp)
        if (pos < -electrostatics.xp) {
            p_val = Na; // Majority
            
            // Minority n(x) = np0 + delta_n * exp(-x/Ln)
            // delta_n = np0 * (exp(Va/Vt) - 1)
            const distFromEdge = -(pos + electrostatics.xp);
            const decay = Math.exp(-distFromEdge / Ln);
            
            // This formula naturally handles both dip and injection
            n_val = np0 * (1 + (injectionFactor - 1) * decay);
        }
        // N-Side Neutral Region (x > xn)
        else if (pos > electrostatics.xn) {
            n_val = Nd; // Majority
            
            // Minority p(x)
            const distFromEdge = pos - electrostatics.xn;
            const decay = Math.exp(-distFromEdge / Lp);
            p_val = pn0 * (1 + (injectionFactor - 1) * decay);
        }
        // Depletion Region (Approximate Bridge)
        else {
            const progress = (pos + electrostatics.xp) / (electrostatics.xp + electrostatics.xn);
            
            // Log-linear interpolation for smooth visual connection
            const logNa = Math.log10(Na);
            const logNd = Math.log10(Nd);
            
            // We clamp the "dip" target to a small non-zero value (e.g., 1e-3)
            // so log10 doesn't return -Infinity.
            const minConc = 1e-3;
            const target_np = Math.max(np0 * injectionFactor, minConc);
            const target_pn = Math.max(pn0 * injectionFactor, minConc);
            
            // Interpolate P: Na -> target_pn
            p_val = Math.pow(10, logNa + progress * (Math.log10(target_pn) - logNa));
            
            // Interpolate N: target_np -> Nd
            n_val = Math.pow(10, Math.log10(target_np) + progress * (logNd - Math.log10(target_np)));
        }

        // Final Safety Clamp for Log Plot
        // If value is too close to 0, clamp it to 1 carrier/cm^3
        if (n_val < 1) n_val = 1; 
        if (p_val < 1) p_val = 1;

        xDist.push(x_microns);
        n.push(n_val);
        p.push(p_val);
    }
    
    return { x: xDist, n: n, p: p };
}