// pn_current.js
export const NI_300K = 1e10; 
export const VT = 0.0259;
export const Q_CHARGE = 1.602e-19;

/**
 * Calculates current and carrier concentration profiles for Module 3
 */
export function calculateCurrentPhysics(Na, Nd, Va) {
    // Assumptions for visualization (Typical Si values)
    const Dn = 25;    // Electron diffusion constant (cm^2/s)
    const Dp = 10;    // Hole diffusion constant (cm^2/s)
    const Ln = 10e-4; // Electron diffusion length (cm)
    const Lp = 10e-4; // Hole diffusion length (cm)

    // Reverse Saturation Current Density (J0 = q * [ (Dp*pn0/Lp) + (Dn*np0/Ln) ])
    const pn0 = (NI_300K ** 2) / Nd;
    const np0 = (NI_300K ** 2) / Na;
    const J0 = Q_CHARGE * ((Dp * pn0 / Lp) + (Dn * np0 / Ln));
    
    // Ideal Diode Current (assuming Area = 1e-4 cm^2)
    const Area = 1e-4;
    const current = (J0 * Area) * (Math.exp(Va / VT) - 1);

    // Excess concentrations at depletion edges
    const delta_np0 = np0 * (Math.exp(Va / VT) - 1);
    const delta_pn0 = pn0 * (Math.exp(Va / VT) - 1);

    return { current, np0, pn0, delta_np0, delta_pn0, Ln, Lp, J0 };
}