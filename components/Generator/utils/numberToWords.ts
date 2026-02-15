export function numberToWordsSpanish(n: number): string {
    const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const tens = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    const tensExtended = ['', '', 'VEINTI', 'TREINTA Y ', 'CUARENTA Y ', 'CINCUENTA Y ', 'SESENTA Y ', 'SETENTA Y ', 'OCHENTA Y ', 'NOVENTA Y '];
    const hundreds = ['', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    if (n === 0) return 'CERO';

    function convertGroup(n: number): string {
        let output = '';
        const h = Math.floor(n / 100);
        const t = Math.floor((n % 100) / 10);
        const u = n % 10;

        if (h > 0) {
            if (h === 1 && t === 0 && u === 0) output += 'CIEN ';
            else if (h === 1) output += 'CIENTO ';
            else output += hundreds[h] + ' ';
        }

        if (t > 0) {
            if (t === 1) {
                output += teens[u] + ' ';
                return output;
            } else if (t === 2 && u === 0) {
                output += 'VEINTE ';
            } else {
                output += tensExtended[t];
            }
        }

        if (u > 0 && t !== 1) {
            if (t === 2) output += units[u] + ' ';
            else output += units[u] + ' ';
        }

        return output;
    }

    let result = '';
    const millions = Math.floor(n / 1000000);
    const thousands = Math.floor((n % 1000000) / 1000);
    const remainder = Math.floor(n % 1000);

    if (millions > 0) {
        result += millions === 1 ? 'UN MILLON ' : convertGroup(millions) + 'MILLONES ';
    }

    if (thousands > 0) {
        result += thousands === 1 ? 'MIL ' : convertGroup(thousands) + 'MIL ';
    }

    if (remainder > 0 || result === '') {
        result += convertGroup(remainder);
    }

    return result.trim();
}
