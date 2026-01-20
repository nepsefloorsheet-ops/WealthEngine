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

function calculatebuy() {
    const quantity = parseFloat(document.getElementById('buyqty').value);
    const buyPrice = parseFloat(document.getElementById('buyamt').value);
    const totalAmt = document.getElementById('total');
    const brokerCommission = document.getElementById('com');
    const sebonFee = document.getElementById('fee');
    const dpCharge = document.getElementById('DP');
    const totalPayable = document.getElementById('payable');
    const wac = document.getElementById('wacc');

    if (isNaN(quantity) || isNaN(buyPrice) || quantity <= 0 || buyPrice <= 0) {
        totalAmt.textContent = '-';
        brokerCommission.textContent = '-';
        sebonFee.textContent = '-';
        dpCharge.textContent = '-';
        totalPayable.textContent = '-';
        wac.textContent = '-';
        return;
    }

    const initialInvestment = quantity * buyPrice;
    let brokerCommissio = 0;
    if (initialInvestment < 2777) {
        brokerCommissio = 10;
    } else if (initialInvestment < 50001) {
        brokerCommissio = initialInvestment * 0.0036;
    } else if (initialInvestment < 500001) {
        brokerCommissio = initialInvestment * 0.0033;
    } else if (initialInvestment < 2000001) {
        brokerCommissio = initialInvestment * 0.0031;
    } else if (initialInvestment < 10000001) {
        brokerCommissio = initialInvestment * 0.0027;
    } else {
        brokerCommissio = initialInvestment * 0.0024;
    }
    const sebonFe = initialInvestment * 0.00015;
    const dpCharg = quantity > 0 ? 25 : 0;
    const amountPayable = initialInvestment + dpCharg + sebonFe + brokerCommissio;
    const wacc = amountPayable / quantity;

    const format2 = (num) =>
        num.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

    totalAmt.textContent = format2(initialInvestment);
    brokerCommission.textContent = format2(brokerCommissio);
    sebonFee.textContent = format2(sebonFe);
    dpCharge.textContent = format2(dpCharg);
    totalPayable.textContent = format2(amountPayable);
    wac.textContent = format2(wacc);
}

function clearBuyCalculator() {
    document.getElementById('buyqty').value = '';
    document.getElementById('buyamt').value = '';
    document.getElementById('total').textContent = '-';
    document.getElementById('com').textContent = '-';
    document.getElementById('fee').textContent = '-';
    document.getElementById('DP').textContent = '-';
    document.getElementById('payable').textContent = '-';
    document.getElementById('wacc').textContent = '-';
}

function calculatesell() {
    const buywacc = parseFloat(document.getElementById('buywacc').value);
    const quantity = parseFloat(document.getElementById('sellqty').value);
    const sellPrice = parseFloat(document.getElementById('sellamt').value);
    const holdingType = document.getElementById('holdingType').value;

    const initialSellingCell = document.getElementById('sellTotal');
    const sellBrokerCommissionCell = document.getElementById('sellcom');
    const sellSebonFeeCell = document.getElementById('sellfee');
    const sellDpChargeCell = document.getElementById('sellDP');
    const capitalGainTaxCell = document.getElementById('cgt');
    const netProfitLossCell = document.getElementById('netProfitLoss');
    const netProfitLossPercentCell = document.getElementById('netProfitLossPercent');
    const amountReceivableCell = document.getElementById('receivable');
    const sellWaccCell = document.getElementById('sellWacc');

    if (isNaN(quantity) || isNaN(buywacc) || isNaN(sellPrice) || quantity <= 0 || buywacc <= 0 || sellPrice <= 0) {
        [initialSellingCell, sellBrokerCommissionCell, sellSebonFeeCell, sellDpChargeCell, capitalGainTaxCell, netProfitLossCell, netProfitLossPercentCell, amountReceivableCell, sellWaccCell].forEach(el => el.textContent = '-');
        return;
    }

    const initialSellingAmount = quantity * sellPrice;
    const investment = quantity * buywacc;

    let brokerCommission = 0;
    if (initialSellingAmount < 2777) brokerCommission = 10;
    else if (initialSellingAmount < 50001) brokerCommission = initialSellingAmount * 0.0036;
    else if (initialSellingAmount < 500001) brokerCommission = initialSellingAmount * 0.0033;
    else if (initialSellingAmount < 2000001) brokerCommission = initialSellingAmount * 0.0031;
    else if (initialSellingAmount < 10000001) brokerCommission = initialSellingAmount * 0.0027;
    else brokerCommission = initialSellingAmount * 0.0024;

    const sebonFee = initialSellingAmount * 0.00015;
    const dpCharg = quantity > 0 ? 25 : 0;
    const totalCommission = brokerCommission + sebonFee + dpCharg;
    const profitBeforeTax = initialSellingAmount - investment - totalCommission;

    let capitalGainTax = 0;
    if (profitBeforeTax > 0) {
        if (holdingType === 'short_term') capitalGainTax = profitBeforeTax * 0.075;
        else if (holdingType === 'long_term') capitalGainTax = profitBeforeTax * 0.05;
    }

    const netProfitLoss = profitBeforeTax - capitalGainTax;
    const netProfitLossPercent = (netProfitLoss / investment) * 100;
    const amountReceivable = initialSellingAmount - totalCommission;
    const sellWacc = amountReceivable / quantity;

    const f = n => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    initialSellingCell.textContent = f(initialSellingAmount);
    sellBrokerCommissionCell.textContent = f(brokerCommission);
    sellSebonFeeCell.textContent = f(sebonFee);
    sellDpChargeCell.textContent = f(dpCharg);
    capitalGainTaxCell.textContent = f(capitalGainTax);
    netProfitLossCell.textContent = f(netProfitLoss);
    netProfitLossPercentCell.textContent = f(netProfitLossPercent) + '%';
    amountReceivableCell.textContent = f(amountReceivable);
    sellWaccCell.textContent = f(sellWacc);
}

function clearSellCalculator() {
    document.getElementById('buywacc').value = '';
    document.getElementById('sellqty').value = '';
    document.getElementById('sellamt').value = '';
    document.getElementById('sellTotal').textContent = '-';
    document.getElementById('sellcom').textContent = '-';
    document.getElementById('sellfee').textContent = '-';
    document.getElementById('sellDP').textContent = '-';
    document.getElementById('cgt').textContent = '-';
    document.getElementById('netProfitLoss').textContent = '-';
    document.getElementById('netProfitLossPercent').textContent = '-';
    document.getElementById('receivable').textContent = '-';
    document.getElementById('sellWacc').textContent = '-';
}
