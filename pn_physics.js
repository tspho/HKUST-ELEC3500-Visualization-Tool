// pn_physics.js
export const EPSILON_SI = 1.035e-12; // F/cm (Permittivity of Silicon)
export const Q_CHARGE = 1.602e-19;   // Coulombs

export function calculatePNJunction(Na, Nd, Va, T = 300) {
    const ni = 1.5e10; // Intrinsic carrier concentration at 300K
    const kBT_q = 0.0259; // Thermal voltage at 300K
    
    // Built-in Potential: Vbi = (kT/q) * ln(Na*Nd / ni^2)
    const Vbi = kBT_q * Math.log((Na * Nd) / Math.pow(ni, 2));
    const Vtotal = Vbi - Va; // Total barrier height

    if (Vtotal <= 0.01) return null; // Prevent numerical errors at high forward bias

    // Depletion Width: W = sqrt( (2 * eps / q) * (1/Na + 1/Nd) * (Vbi - Va) )
    const W = Math.sqrt((2 * EPSILON_SI / Q_CHARGE) * (1/Na + 1/Nd) * Vtotal);
    
    // xn and xp components
    const xn = W * (Na / (Na + Nd));
    const xp = W * (Nd / (Na + Nd));
    
    // Max Electric Field: Emax = -q * Nd * xn / eps
    const Emax = -(Q_CHARGE * Nd * xn) / EPSILON_SI;

    return { Vbi, Vtotal, W, xn, xp, Emax };
}