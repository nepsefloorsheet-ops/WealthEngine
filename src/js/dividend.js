function formatIndianNumber(num) {
    if (isNaN(num)) return "0";
    let [integerPart, decimalPart] = num.toFixed(2).split(".");
    let lastThree = integerPart.slice(-3);
    let otherNumbers = integerPart.slice(0, -3);
    if (otherNumbers !== "") {
        lastThree = "," + lastThree;
        otherNumbers = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    }
    return otherNumbers + lastThree + "." + decimalPart;
}

function calculatedividend() {
    const quantity = Number(document.getElementById("qty")?.value) || 0;
    const bonuspercent = Number(document.getElementById("bonus")?.value) || 0;
    const cashpercent = Number(document.getElementById("cash")?.value) || 0;
    const paidUpcapital = Number(document.getElementById("paidup")?.value) || 0;

    if (quantity <= 0 || paidUpcapital <= 0) {
        alert("Please enter valid quantity and select a valid paid-up capital.");
        return;
    }

    const totalBonusShares = (quantity * bonuspercent) / 100;
    const totalCashDividend = (quantity * paidUpcapital * cashpercent) / 100;
    const bonusShareTax = (totalBonusShares * paidUpcapital * 5) / 100;
    const cashDividendTax = (totalCashDividend * 5) / 100;
    const totalTaxPayable = bonusShareTax + cashDividendTax;

    function safeSetText(id, value) {
        const el = document.getElementById(id);
        if (el) el.innerText = formatIndianNumber(value);
    }

    safeSetText("total", totalCashDividend);
    safeSetText("bsharetax", bonusShareTax);
    safeSetText("catax", cashDividendTax);
    safeSetText("totaltax", totalTaxPayable);
    safeSetText("rbqty", totalBonusShares);
}

function clearDividendCalculator() {
    document.getElementById('qty').value = '';
    document.getElementById('bonus').value = '';
    document.getElementById('cash').value = '';
    document.getElementById('total').textContent = '-';
    document.getElementById('bsharetax').textContent = '-';
    document.getElementById('catax').textContent = '-';
    document.getElementById('totaltax').textContent = '-';
    document.getElementById('rbqty').textContent = '-';
}
