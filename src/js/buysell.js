(function() {
    function format2(num) {
        if (isNaN(num)) return "0.00";
        return num.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function calculatebuy() {
        const qtyEl = document.getElementById('buyqty');
        const priceEl = document.getElementById('buyamt');
        if (!qtyEl || !priceEl) return;

        const quantity = parseFloat(qtyEl.value);
        const buyPrice = parseFloat(priceEl.value);
        
        const results = {
            total: document.getElementById('total'),
            com: document.getElementById('com'),
            fee: document.getElementById('fee'),
            dp: document.getElementById('DP'),
            payable: document.getElementById('payable'),
            wacc: document.getElementById('wacc')
        };

        if (isNaN(quantity) || isNaN(buyPrice) || quantity <= 0 || buyPrice <= 0) {
            Object.values(results).forEach(el => el && (el.textContent = '-'));
            return;
        }

        const initialInvestment = quantity * buyPrice;
        let brokerCommission = 0;
        if (initialInvestment < 2777) brokerCommission = 10;
        else if (initialInvestment < 50001) brokerCommission = initialInvestment * 0.0036;
        else if (initialInvestment < 500001) brokerCommission = initialInvestment * 0.0033;
        else if (initialInvestment < 2000001) brokerCommission = initialInvestment * 0.0031;
        else if (initialInvestment < 10000001) brokerCommission = initialInvestment * 0.0027;
        else brokerCommission = initialInvestment * 0.0024;

        const sebonFee = initialInvestment * 0.00015;
        const dpCharge = 25;
        const totalPayable = initialInvestment + dpCharge + sebonFee + brokerCommission;
        const wacc = totalPayable / quantity;

        results.total.textContent = format2(initialInvestment);
        results.com.textContent = format2(brokerCommission);
        results.fee.textContent = format2(sebonFee);
        results.dp.textContent = format2(dpCharge);
        results.payable.textContent = format2(totalPayable);
        results.wacc.textContent = format2(wacc);
    }

    function clearBuy() {
        ['buyqty', 'buyamt'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        ['total', 'com', 'fee', 'DP', 'payable', 'wacc'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '-';
        });
    }

    function calculatesell() {
        const bWaccEl = document.getElementById('buywacc');
        const sQtyEl = document.getElementById('sellqty');
        const sPriceEl = document.getElementById('sellamt');
        const hTypeEl = document.getElementById('holdingType');
        if (!bWaccEl || !sQtyEl || !sPriceEl || !hTypeEl) return;

        const buywacc = parseFloat(bWaccEl.value);
        const quantity = parseFloat(sQtyEl.value);
        const sellPrice = parseFloat(sPriceEl.value);
        const holdingType = hTypeEl.value;

        const results = {
            total: document.getElementById('sellTotal'),
            com: document.getElementById('sellcom'),
            fee: document.getElementById('sellfee'),
            dp: document.getElementById('sellDP'),
            cgt: document.getElementById('cgt'),
            netPL: document.getElementById('netProfitLoss'),
            netPLPct: document.getElementById('netProfitLossPercent'),
            receivable: document.getElementById('receivable'),
            wacc: document.getElementById('sellWacc')
        };

        if (isNaN(quantity) || isNaN(buywacc) || isNaN(sellPrice) || quantity <= 0 || buywacc <= 0 || sellPrice <= 0) {
            Object.values(results).forEach(el => el && (el.textContent = '-'));
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
        const dpCharge = 25;
        const totalReceivable = initialSellingAmount - brokerCommission - sebonFee - dpCharge;
        const profit = totalReceivable - investment;

        let cgt = 0;
        if (profit > 0) {
            cgt = profit * (holdingType === 'short_term' ? 0.075 : 0.05);
        }

        const netProfit = profit - cgt;
        const netProfitPercent = (netProfit / investment) * 100;
        const amountReceivableAfterCGT = totalReceivable - cgt;

        results.total.textContent = format2(initialSellingAmount);
        results.com.textContent = format2(brokerCommission);
        results.fee.textContent = format2(sebonFee);
        results.dp.textContent = format2(dpCharge);
        results.cgt.textContent = format2(cgt);
        results.netPL.textContent = format2(netProfit);
        results.netPLPct.textContent = format2(netProfitPercent) + '%';
        results.receivable.textContent = format2(amountReceivableAfterCGT);
        results.wacc.textContent = format2(buywacc);
    }

    function clearSell() {
        ['buywacc', 'sellqty', 'sellamt'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        ['sellTotal', 'sellcom', 'sellfee', 'sellDP', 'cgt', 'netProfitLoss', 'netProfitLossPercent', 'receivable', 'sellWacc'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '-';
        });
    }

    function init() {
        const buyClearBtn = document.getElementById('buyClear');
        const sellClearBtn = document.getElementById('sellClear');

        if (buyClearBtn) buyClearBtn.addEventListener('click', clearBuy);
        if (sellClearBtn) sellClearBtn.addEventListener('click', clearSell);

        ['buyqty', 'buyamt'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', calculatebuy);
        });

        ['buywacc', 'sellqty', 'sellamt', 'holdingType'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', calculatesell);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
