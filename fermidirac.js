// fermidirac.js
export const K_BOLTZMANN = 8.617333262e-5; // eV/K

export const SILICON = {
    Eg0: 1.166, alpha: 4.73e-4, beta: 636,
    Nc300: 2.8e19, Nv300: 1.04e19,
    Ed: 0.045, Ea: 0.057
};

export function getBandGap(T) {
    const temp = Math.max(T, 1);
    return SILICON.Eg0 - (SILICON.alpha * temp * temp) / (temp + SILICON.beta);
}

export function getNc(T) {
    const temp = Math.max(T, 1);
    return SILICON.Nc300 * Math.pow(temp / 300, 1.5);
}

export function getNv(T) {
    const temp = Math.max(T, 1);
    return SILICON.Nv300 * Math.pow(temp / 300, 1.5);
}

export function getIntrinsicConcentration(T) {
    const temp = Math.max(T, 1);
    const Eg = getBandGap(temp);
    return Math.sqrt(getNc(temp) * getNv(temp)) * Math.exp(-Eg / (2 * K_BOLTZMANN * temp));
}

export function fermiDirac(E, Ef, T) {
    const temp = Math.max(T, 1);
    const visualT = temp * 2.0; // Exaggerates slope for clarity
    const x = (E - Ef) / (K_BOLTZMANN * visualT);
    if (x > 100) return 0;
    if (x < -100) return 1;
    return 1 / (1 + Math.exp(x));
}

export function calculateFermiLevel(T, Nd = 0, Na = 0) {
    const temp = Math.max(T, 1);
    const Eg = getBandGap(temp);
    const Ec = Eg, Ev = 0;
    const ni = getIntrinsicConcentration(temp);
    const kBT = K_BOLTZMANN * temp;

    // Freeze-out Anchor for low temperatures
    if (temp < 45) {
        if (Nd > 0) return Ec - (SILICON.Ed / 2);
        if (Na > 0) return Ev + (SILICON.Ea / 2);
        return Eg / 2;
    }

    // Analytical solving for N or P type
    if (Nd > 0) {
        const n = (Nd / 2) + Math.sqrt(Math.pow(Nd / 2, 2) + Math.pow(ni, 2));
        return Math.min(Ec + kBT * Math.log(n / getNc(temp)), Ec - 0.002);
    } else if (Na > 0) {
        const p = (Na / 2) + Math.sqrt(Math.pow(Na / 2, 2) + Math.pow(ni, 2));
        return Math.max(Ev - kBT * Math.log(p / getNv(temp)), Ev + 0.002);
    }
    return Eg / 2;
}